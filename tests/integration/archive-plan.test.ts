// archivePlan integration test — Plan 01-06 Task 1.
//
// Asserts:
//   1) Owner archives the seed plan; the plan disappears from getMyPlans (which
//      filters archived_at IS NULL — Plan 01-05).
//   2) Direct DB lookup via service-role still finds the row (soft-delete, data
//      preserved — D-05 / PLAN-05 / RESEARCH §Open Question 5).
//
// Skips cleanly when local Supabase is unreachable.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  SEED_OWNER_EMAIL,
  SEED_OWNER_ID,
  SEED_OWNER_PASSWORD,
  SEED_PLAN_ID,
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

afterAll(async () => {
  if (skipReason) return;
  // Always clear archived_at on the seed plan post-suite.
  const admin = adminClient();
  await admin
    .from('plans')
    .update({ archived_at: null })
    .eq('id', SEED_PLAN_ID);
});

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

async function mockSession(accessToken: string, refreshToken: string, redirectShim: ReturnType<typeof makeRedirectShim>) {
  const cookieEntries = [
    { name: 'sb-access-token', value: accessToken },
    { name: 'sb-refresh-token', value: refreshToken },
  ];
  vi.doMock('next/headers', () => ({
    cookies: async () => ({
      getAll: () => cookieEntries,
      get: (n: string) => cookieEntries.find((c) => c.name === n),
      set: () => {
        /* no-op */
      },
    }),
  }));
  vi.doMock('next/navigation', () => ({
    redirect: redirectShim.throwRedirect,
  }));
  vi.doMock('next/cache', () => ({
    revalidatePath: () => {
      /* no-op */
    },
  }));
  vi.doMock('@/lib/supabase/server', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    return {
      createServerClient: () => {
        const c = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          { auth: { persistSession: false, autoRefreshToken: false } }
        );
        void c.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        return c;
      },
    };
  });
}

describe('archivePlan Server Action — integration', () => {
  it('owner archives the seed plan; getMyPlans excludes it; row is still present in DB', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }

    const admin = adminClient();
    // Pre-state: clear archived_at.
    await admin
      .from('plans')
      .update({ archived_at: null })
      .eq('id', SEED_PLAN_ID);

    const { session } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    if (!session) throw new Error('signIn returned no session');

    const redirectShim = makeRedirectShim();
    await mockSession(session.access_token, session.refresh_token, redirectShim);

    const { archivePlan } = await import('@/server/actions/plan');

    const fd = new FormData();
    fd.set('planId', SEED_PLAN_ID);

    let caught: unknown = null;
    try {
      await archivePlan(fd);
    } catch (err) {
      caught = err;
    }
    // On success archivePlan throws NEXT_REDIRECT('/me').
    expect(caught).toBeTruthy();
    expect((caught as { digest?: string }).digest ?? '').toMatch(/^NEXT_REDIRECT/);
    expect(redirectShim.calls).toContain('/me');

    // Verify archived_at is now set.
    const archived = await admin
      .from('plans')
      .select('archived_at, slug')
      .eq('id', SEED_PLAN_ID)
      .single();
    expect(archived.error).toBeNull();
    expect(archived.data?.archived_at).not.toBeNull();
    // Row is still present (soft-delete invariant).
    expect(archived.data?.slug).toBe('seed-plan');

    // Verify getMyPlans excludes it for the owner.
    vi.resetModules();
    const { getMyPlans } = await import('@/lib/db/queries/plans');
    const { client: ownerClient } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    const myPlans = await getMyPlans(ownerClient, SEED_OWNER_ID);
    const found = myPlans.find((p) => p.id === SEED_PLAN_ID);
    expect(found).toBeUndefined();

    // Cleanup — clear archived_at.
    await admin
      .from('plans')
      .update({ archived_at: null })
      .eq('id', SEED_PLAN_ID);
  });
});
