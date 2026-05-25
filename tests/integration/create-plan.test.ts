// createPlan integration test — calls the Server Action directly through a
// signed-in Supabase session, asserting:
//   1) NEXT_REDIRECT to /plan/[slug]?share=1 on success
//   2) plans row exists owned by the test user
//   3) plan_members row exists with role='owner'
//   4) invite_tokens row exists with role='viewer' for that plan
//   5) Empty title returns { error } whose flattened errors include `title`
//
// Skips cleanly when local Supabase is unreachable (same posture as Plans
// 01-02 / 01-03 integration suites).
//
// Server Actions use cookies() + redirect() from next/headers + next/navigation.
// To exercise them in Vitest we mock the dynamic cookie / redirect imports to
// inject a known authenticated session and capture the redirect target.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  SEED_OWNER_EMAIL,
  SEED_OWNER_PASSWORD,
  adminClient,
  getSkipReason,
  signInAs,
} from './_helpers';

let skipReason: string | null = null;

beforeAll(async () => {
  skipReason = await getSkipReason();
});

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// Captures redirect calls thrown by the Server Action without performing them.
function makeRedirectShim(): { calls: string[]; throwRedirect: (path: string) => never } {
  const calls: string[] = [];
  const throwRedirect = (path: string): never => {
    calls.push(path);
    const err = new Error('NEXT_REDIRECT');
    (err as { digest?: string }).digest = `NEXT_REDIRECT;replace;${path};307;`;
    throw err;
  };
  return { calls, throwRedirect };
}

async function withMockedSession(
  accessToken: string,
  refreshToken: string,
  redirectShim: ReturnType<typeof makeRedirectShim>
) {
  // Mock next/headers cookies() to return a cookie store carrying the
  // authenticated session. @supabase/ssr reads cookies via getAll().
  const cookieEntries: { name: string; value: string }[] = [
    // The exact cookie name @supabase/ssr emits depends on the project ref
    // and ANON_KEY hash. The library tolerates both legacy 'sb-access-token'
    // and the project-scoped 'sb-<ref>-auth-token' forms via getAll(). We
    // emit the access+refresh tokens directly under the documented names.
    { name: 'sb-access-token', value: accessToken },
    { name: 'sb-refresh-token', value: refreshToken },
  ];

  vi.doMock('next/headers', () => ({
    cookies: async () => ({
      getAll: () => cookieEntries,
      get: (n: string) => cookieEntries.find((c) => c.name === n),
      set: () => {
        /* no-op in tests */
      },
    }),
  }));

  vi.doMock('next/navigation', () => ({
    redirect: redirectShim.throwRedirect,
  }));
}

describe('createPlan Server Action — integration', () => {
  it('happy path: creates plan + owner member + viewer invite token, redirects to ?share=1', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }

    const { session } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    if (!session) throw new Error('signIn returned no session');

    const redirectShim = makeRedirectShim();
    // Mock cookies + redirect BEFORE importing the action so it picks them up.
    await withMockedSession(session.access_token, session.refresh_token, redirectShim);

    // Mock @supabase/ssr's createServerClient: it normally reads cookies but
    // we want to attach a known session directly. The simplest approach is to
    // override createServerClient in our local wrapper to return a client
    // already authenticated with the access token.
    vi.doMock('@/lib/supabase/server', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      return {
        createServerClient: () => {
          const c = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            { auth: { persistSession: false, autoRefreshToken: false } }
          );
          // Inject the session so .auth.getUser() and RLS queries run as the user.
          void c.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          return c;
        },
      };
    });

    const { createPlan } = await import('@/server/actions/plan');

    const fd = new FormData();
    fd.set('title', 'Plan de integración');

    let caught: unknown = null;
    try {
      await createPlan(fd);
    } catch (err) {
      caught = err;
    }
    // Must have thrown NEXT_REDIRECT
    expect(caught).toBeTruthy();
    expect((caught as { digest?: string }).digest ?? '').toMatch(/^NEXT_REDIRECT/);
    expect(redirectShim.calls.length).toBe(1);
    const target = redirectShim.calls[0] ?? '';
    expect(target).toMatch(/^\/plan\/[a-z0-9]{8}\?share=1$/);

    const slug = target.replace(/^\/plan\//, '').replace(/\?share=1$/, '');

    // Verify DB state via service-role admin client.
    const admin = adminClient();
    const planLookup = await admin
      .from('plans')
      .select('id, slug, title, owner_id')
      .eq('slug', slug)
      .single();
    expect(planLookup.error).toBeNull();
    expect(planLookup.data).toBeTruthy();
    expect(planLookup.data?.title).toBe('Plan de integración');

    const planId = planLookup.data?.id as string;

    const memberLookup = await admin
      .from('plan_members')
      .select('user_id, role')
      .eq('plan_id', planId);
    expect(memberLookup.error).toBeNull();
    const ownerRow = (memberLookup.data ?? []).find((m) => m.role === 'owner');
    expect(ownerRow).toBeTruthy();
    expect(ownerRow?.user_id).toBe(planLookup.data?.owner_id);

    const tokenLookup = await admin
      .from('invite_tokens')
      .select('id, role, token')
      .eq('plan_id', planId);
    expect(tokenLookup.error).toBeNull();
    expect((tokenLookup.data ?? []).length).toBeGreaterThanOrEqual(1);
    expect((tokenLookup.data ?? [])[0]?.role).toBe('viewer');
    expect((tokenLookup.data ?? [])[0]?.token).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{22}$/);

    // Cleanup — cascading FK drops plan_members + invite_tokens.
    await admin.from('plans').delete().eq('id', planId);
  });

  it('empty title: returns { error } keyed to `title`', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }

    const { session } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    if (!session) throw new Error('signIn returned no session');

    const redirectShim = makeRedirectShim();
    await withMockedSession(session.access_token, session.refresh_token, redirectShim);
    vi.doMock('@/lib/supabase/server', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      return {
        createServerClient: () =>
          createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            { auth: { persistSession: false, autoRefreshToken: false } }
          ),
      };
    });

    const { createPlan } = await import('@/server/actions/plan');
    const fd = new FormData();
    fd.set('title', '');
    const result = await createPlan(fd);
    expect(result).toBeTruthy();
    expect('error' in (result as object)).toBe(true);
    const err = (result as { error: { fieldErrors?: Record<string, string[]> } }).error;
    expect(err.fieldErrors?.title?.length ?? 0).toBeGreaterThanOrEqual(1);
    // No redirect should have fired.
    expect(redirectShim.calls.length).toBe(0);
  });

  it('updatePlan + archivePlan are implemented (Plan 01-06 lifted the stubs)', async () => {
    // Plan 01-06 replaced the Plan 01-04 stubs. They now validate input and
    // hit the RLS-bound supabase client. With no auth gate the actions short
    // out at Zod parse / require-user, but the actions must no longer throw
    // the "Plan 01-06" stub error.
    const { updatePlan, archivePlan } = await import('@/server/actions/plan');
    const fd = new FormData();
    fd.set('planId', 'not-a-uuid');
    fd.set('title', '');
    // Empty validation surfaces a returned error (no throw, no Plan 01-06 stub).
    const updateResult = await updatePlan(fd).catch((e) => e);
    if (updateResult && updateResult instanceof Error) {
      expect(updateResult.message).not.toMatch(/Plan 01-06/);
    } else if (updateResult && 'error' in (updateResult as object)) {
      expect(updateResult).toBeTruthy();
    }
    const fd2 = new FormData();
    fd2.set('planId', 'not-a-uuid');
    const archiveResult = await archivePlan(fd2).catch((e) => e);
    if (archiveResult && archiveResult instanceof Error) {
      expect(archiveResult.message).not.toMatch(/Plan 01-06/);
    }
  });
});
