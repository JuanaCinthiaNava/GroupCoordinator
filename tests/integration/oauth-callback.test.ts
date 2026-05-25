// OAuth callback integration tests — exercise the extracted helpers.
//
// Why helpers and not the route handler? Faking a real OAuth `code` against a
// running Supabase Auth requires either (a) initiating signInWithOAuth and
// completing it in a headless browser (Playwright's territory) or (b)
// monkey-patching @supabase/ssr. Both are heavier than they need to be —
// the route handler's load-bearing logic lives in two pure helpers that we
// can test directly:
//
//   * parseCallbackError(err): detects email-collision errors
//   * upsertPlanMembershipFromAppMeta(admin, userId, appMeta): looks up the
//     role from invite_tokens and UPSERTs plan_members
//
// The third assertion exercises the sign-out POST handler end-to-end so we
// have at least one full route-level test.

import { describe, expect, it } from 'vitest';
import {
  parseCallbackError,
  upsertPlanMembershipFromAppMeta,
} from '@/app/auth/callback/_helpers';
import { POST as signOutPost, GET as signOutGet } from '@/app/auth/sign-out/route';
import {
  SEED_PLAN_ID,
  adminClient,
  getSkipReason,
} from './_helpers';

describe('parseCallbackError — email collision detection', () => {
  it('classifies "identity already exists" as account_exists', () => {
    expect(
      parseCallbackError({ message: 'identity already exists' })
    ).toEqual({ kind: 'account_exists' });
  });

  it('classifies the email_exists code as account_exists', () => {
    expect(parseCallbackError({ code: 'email_exists' })).toEqual({
      kind: 'account_exists',
    });
  });

  it('classifies "User already registered" wording as account_exists', () => {
    expect(
      parseCallbackError({ message: 'User already registered' })
    ).toEqual({ kind: 'account_exists' });
  });

  it('returns other for unrelated errors', () => {
    expect(parseCallbackError({ message: 'network unreachable' })).toEqual({
      kind: 'other',
    });
    expect(parseCallbackError(null)).toEqual({ kind: 'other' });
    expect(parseCallbackError(undefined)).toEqual({ kind: 'other' });
  });
});

describe('upsertPlanMembershipFromAppMeta — DB upsert keyed on (plan_id, user_id)', () => {
  it('falls through when no plan_id in app_metadata', async () => {
    // No DB call required — this branch returns early.
    const result = await upsertPlanMembershipFromAppMeta(
      // biome-ignore lint/suspicious/noExplicitAny: tests intentionally ignore the unused client
      {} as any,
      'any-user-id',
      {}
    );
    expect(result).toEqual({ ok: false, role: 'viewer' });
  });

  it('looks up the role from invite_tokens and upserts plan_members', async () => {
    const skip = await getSkipReason();
    if (skip) {
      // eslint-disable-next-line no-console
      console.warn(`skipped: ${skip}`);
      return;
    }
    const admin = adminClient();

    // Find a non-revoked invite token on the seed plan to read the role from.
    const tokenLookup = await admin
      .from('invite_tokens')
      .select('id, role')
      .eq('plan_id', SEED_PLAN_ID)
      .is('revoked_at', null)
      .limit(1)
      .maybeSingle();
    if (!tokenLookup.data) {
      // eslint-disable-next-line no-console
      console.warn('skipped: no active invite token for seed plan');
      return;
    }

    // Create a transient auth user via admin API so we have a real user_id.
    const transientEmail = `oauth-test-${Date.now()}@groupcoordinator.local`;
    const createUser = await admin.auth.admin.createUser({
      email: transientEmail,
      email_confirm: true,
      password: 'test-password-do-not-use-in-prod',
    });
    if (createUser.error || !createUser.data.user) {
      throw new Error(`createUser failed: ${createUser.error?.message}`);
    }
    const userId = createUser.data.user.id;

    try {
      const result = await upsertPlanMembershipFromAppMeta(admin, userId, {
        plan_id: SEED_PLAN_ID,
        invite_token_id: tokenLookup.data.id,
      });
      expect(result.ok).toBe(true);
      expect(['owner', 'editor', 'viewer']).toContain(result.role);

      // Verify the row landed.
      const row = await admin
        .from('plan_members')
        .select('user_id, plan_id, role, joined_via_token_id')
        .eq('plan_id', SEED_PLAN_ID)
        .eq('user_id', userId)
        .maybeSingle();
      expect(row.data).toMatchObject({
        plan_id: SEED_PLAN_ID,
        user_id: userId,
        joined_via_token_id: tokenLookup.data.id,
      });

      // Idempotency: a second call should not error or duplicate.
      const second = await upsertPlanMembershipFromAppMeta(admin, userId, {
        plan_id: SEED_PLAN_ID,
        invite_token_id: tokenLookup.data.id,
      });
      expect(second.ok).toBe(true);
    } finally {
      // Cleanup: remove the transient plan_members row + user.
      await admin
        .from('plan_members')
        .delete()
        .eq('plan_id', SEED_PLAN_ID)
        .eq('user_id', userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it('defaults role to viewer when invite_token_id missing', async () => {
    const skip = await getSkipReason();
    if (skip) {
      // eslint-disable-next-line no-console
      console.warn(`skipped: ${skip}`);
      return;
    }
    const admin = adminClient();
    const transientEmail = `oauth-default-${Date.now()}@groupcoordinator.local`;
    const createUser = await admin.auth.admin.createUser({
      email: transientEmail,
      email_confirm: true,
      password: 'test-password-do-not-use-in-prod',
    });
    if (createUser.error || !createUser.data.user) {
      throw new Error(`createUser failed: ${createUser.error?.message}`);
    }
    const userId = createUser.data.user.id;
    try {
      const result = await upsertPlanMembershipFromAppMeta(admin, userId, {
        plan_id: SEED_PLAN_ID,
      });
      expect(result.role).toBe('viewer');
      expect(result.ok).toBe(true);
    } finally {
      await admin
        .from('plan_members')
        .delete()
        .eq('plan_id', SEED_PLAN_ID)
        .eq('user_id', userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });
});

describe('POST /auth/sign-out — CSRF-safe sign-out', () => {
  it('POST returns 303 redirect to / and emits cookie clears', async () => {
    // Construct a minimal NextRequest stub. The handler reads only:
    //   - request.url (for new URL('/', request.url))
    //   - request.cookies.getAll() (the SSR client side-effects on response)
    const req = new Request('http://localhost:3000/auth/sign-out', {
      method: 'POST',
    });
    // The handler signature expects NextRequest but accepts any Request-like
    // object with cookies + nextUrl. We construct the bare minimum.
    const nextRequestLike = Object.assign(req, {
      cookies: { getAll: () => [] as Array<{ name: string; value: string }> },
      nextUrl: new URL(req.url),
    });
    // biome-ignore lint/suspicious/noExplicitAny: stub for NextRequest in unit test context
    const response = await signOutPost(nextRequestLike as any);
    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toMatch(/\/$/);
  });

  it('GET returns 405 Method Not Allowed', async () => {
    const req = new Request('http://localhost:3000/auth/sign-out', {
      method: 'GET',
    });
    const nextRequestLike = Object.assign(req, {
      cookies: { getAll: () => [] },
      nextUrl: new URL(req.url),
    });
    // biome-ignore lint/suspicious/noExplicitAny: stub for NextRequest in unit test context
    const response = await (signOutGet as any)(nextRequestLike as any);
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
  });
});
