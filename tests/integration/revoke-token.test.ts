// revokeInviteToken integration test — Plan 01-06 Task 1.
//
// Asserts:
//   1) Owner can revoke the seeded valid invite token; the invite handler then
//      302s to /errors/token-revoked for that token (PLAN-04 success criterion).
//   2) Non-owner attempts (signed-in as the second seed user) get RLS-blocked
//      and the token's revoked_at stays null.
//
// Skips cleanly when local Supabase is unreachable (Docker not running).

import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  SEED_OTHER_EMAIL,
  SEED_OTHER_PASSWORD,
  SEED_OWNER_EMAIL,
  SEED_OWNER_PASSWORD,
  adminClient,
  getSkipReason,
  signInAs,
} from './_helpers';

let skipReason: string | null = null;
const VALID_TOKEN = 'seedvakjdtpken22charsx';

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
  // Final cleanup: clear revoked_at on the seed token so other suites can
  // re-run this file.
  const admin = adminClient();
  await admin
    .from('invite_tokens')
    .update({ revoked_at: null })
    .eq('token', VALID_TOKEN);
});

async function mockSupabaseSession(accessToken: string, refreshToken: string) {
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

describe('revokeInviteToken Server Action — integration', () => {
  it('owner revokes the seed token; subsequent /api/invite/[token] 307s to /errors/token-revoked', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }

    const admin = adminClient();
    // Look up the seed token's id (we hardcode the value, not the uuid).
    const tokenRow = await admin
      .from('invite_tokens')
      .select('id, revoked_at')
      .eq('token', VALID_TOKEN)
      .single();
    expect(tokenRow.error).toBeNull();
    const tokenId = tokenRow.data?.id as string;

    // Ensure pre-state: revoked_at is null (in case a prior failed run left it set).
    await admin
      .from('invite_tokens')
      .update({ revoked_at: null })
      .eq('id', tokenId);

    const { session } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    if (!session) throw new Error('signIn returned no session');

    await mockSupabaseSession(session.access_token, session.refresh_token);

    const { revokeInviteToken } = await import('@/server/actions/invite-token');

    const fd = new FormData();
    fd.set('tokenId', tokenId);
    const result = await revokeInviteToken(fd);
    // void return on success
    expect(result).toBeUndefined();

    // Verify revoked_at is now non-null.
    const after = await admin
      .from('invite_tokens')
      .select('revoked_at')
      .eq('id', tokenId)
      .single();
    expect(after.error).toBeNull();
    expect(after.data?.revoked_at).not.toBeNull();

    // Hit the invite handler to confirm the public route now lands on the
    // revoked error page (the user-visible PLAN-04 outcome).
    vi.resetModules();
    const { GET } = await import('@/app/api/invite/[token]/route');
    const url = new URL(`/api/invite/${VALID_TOKEN}`, 'http://localhost:3000');
    const req = new NextRequest(url);
    const res = await GET(req, { params: Promise.resolve({ token: VALID_TOKEN }) });
    expect(res.status).toBe(307);
    expect(res.headers.get('Location') ?? '').toMatch(/\/errors\/token-revoked/);

    // Cleanup — clear revoked_at so subsequent test runs start clean.
    await admin
      .from('invite_tokens')
      .update({ revoked_at: null })
      .eq('id', tokenId);
  });

  it('non-owner cannot revoke the seed token (RLS blocks)', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }

    const admin = adminClient();
    const tokenRow = await admin
      .from('invite_tokens')
      .select('id')
      .eq('token', VALID_TOKEN)
      .single();
    const tokenId = tokenRow.data?.id as string;

    // Pre-state: clear revoked_at.
    await admin
      .from('invite_tokens')
      .update({ revoked_at: null })
      .eq('id', tokenId);

    const { session } = await signInAs(SEED_OTHER_EMAIL, SEED_OTHER_PASSWORD);
    if (!session) throw new Error('signIn (other) returned no session');

    await mockSupabaseSession(session.access_token, session.refresh_token);

    const { revokeInviteToken } = await import('@/server/actions/invite-token');

    const fd = new FormData();
    fd.set('tokenId', tokenId);
    const result = await revokeInviteToken(fd);
    // RLS blocks → maybeSingle returns null → action returns { error: 'token_revoke_forbidden' }.
    expect(result).toBeTruthy();
    expect((result as { error: string }).error).toContain('forbidden');

    // Confirm DB unchanged.
    const after = await admin
      .from('invite_tokens')
      .select('revoked_at')
      .eq('id', tokenId)
      .single();
    expect(after.data?.revoked_at).toBeNull();
  });
});
