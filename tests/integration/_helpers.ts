// Integration test shared helpers.
//
// All tests in tests/integration/* are LIVE-DB tests against a local Supabase
// stack started via `pnpm supabase start` (requires Docker). If the stack is
// unreachable, the suites SKIP cleanly with a remediation message rather than
// erroring — this matches the deferred-environment posture from Plan 01-01.

import { type SupabaseClient, createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local once so test files don't have to.
(function loadDotEnvOnce() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
})();

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const DATABASE_MIGRATION_URL =
  process.env.DATABASE_MIGRATION_URL ?? '';

export const SEED_PLAN_ID = '00000000-0000-0000-0000-000000000001';
export const SEED_OWNER_ID = '00000000-0000-0000-0000-000000000099';
export const SEED_OTHER_ID = '00000000-0000-0000-0000-000000000088';
export const SEED_OWNER_EMAIL = 'test@groupcoordinator.local';
export const SEED_OWNER_PASSWORD = 'test-password-do-not-use-in-prod';
export const SEED_OTHER_EMAIL = 'other@groupcoordinator.local';
export const SEED_OTHER_PASSWORD = 'other-password-do-not-use-in-prod';

/**
 * Probe whether the local Supabase REST endpoint is reachable. Returns a
 * skip-reason string when unreachable so the caller can `it.skip(reason)` or
 * `describe.skip(reason)`. Returns null when reachable.
 *
 * Usage:
 *   const skip = await getSkipReason();
 *   if (skip) { test.skip(skip); return; }
 */
export async function getSkipReason(): Promise<string | null> {
  if (
    !SUPABASE_URL ||
    !ANON_KEY ||
    !SERVICE_ROLE_KEY ||
    SUPABASE_URL.includes('<from supabase status>')
  ) {
    return 'Supabase env not configured. Run `pnpm supabase start` and copy values into .env.local.';
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: ANON_KEY },
      // Avoid hanging the suite — the local stack responds in <100ms.
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) {
      return `Supabase health check failed: HTTP ${res.status}. Did you run 'pnpm supabase start'?`;
    }
  } catch (err) {
    return `Supabase not running at ${SUPABASE_URL}. Run 'pnpm supabase start' first. (${(err as Error).message})`;
  }
  // Probe the policies/seed are installed by counting RLS-enabled tables.
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { count, error } = await admin
      .from('plans')
      .select('id', { count: 'exact', head: true });
    if (error || count === null) {
      return `Schema or seed not applied. Run migrations + policies + seed. (${error?.message ?? 'no count'})`;
    }
  } catch (err) {
    return `Schema probe failed: ${(err as Error).message}`;
  }
  return null;
}

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Sign in via email+password (seeded test users). Returns a client whose
 * session is set so subsequent .from() queries run as the authenticated user.
 */
export async function signInAs(email: string, password: string) {
  const client = anonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, session: data.session };
}

/**
 * Mint an anonymous user with the given app_metadata.plan_id and return a
 * client whose JWT carries that claim (after refreshSession picks up the hook).
 */
export async function anonClientWithPlanClaim(
  planId: string | null,
): Promise<SupabaseClient> {
  const admin = adminClient();
  const session = anonClient();
  const { data: anon, error } = await session.auth.signInAnonymously();
  if (error || !anon.user) throw new Error(`signInAnonymously failed: ${error?.message}`);

  if (planId !== null) {
    const { error: updateErr } = await admin.auth.admin.updateUserById(anon.user.id, {
      app_metadata: { plan_id: planId },
    });
    if (updateErr) throw new Error(`updateUserById failed: ${updateErr.message}`);
    const { error: refreshErr } = await session.auth.refreshSession();
    if (refreshErr) throw new Error(`refreshSession failed: ${refreshErr.message}`);
  }
  return session;
}
