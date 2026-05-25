// OAuth callback helpers — extracted for testability.
//
// Integration tests import these directly so they can exercise the
// post-exchange logic (email-collision detection, plan_members upsert)
// without faking a full OAuth code-exchange round trip.

import type { SupabaseClient } from '@supabase/supabase-js';

export type ParsedCallbackError = { kind: 'account_exists' | 'other' };

/**
 * Detect email-collision errors from exchangeCodeForSession.
 * RESEARCH §Area 2 + Assumption A2: the error message format is not contract-
 * stable across Supabase versions, so we match a broad substring set:
 *   - 'identity already exists' (Supabase Go-Auth/GoTrue legacy text)
 *   - 'email_exists' (new error code surfaced as a substring on .name/.code)
 *   - 'already exists' (defensive — any "already exists" phrasing is enough)
 */
export function parseCallbackError(err: unknown): ParsedCallbackError {
  if (!err) return { kind: 'other' };
  const e = err as { message?: unknown; name?: unknown; code?: unknown };
  const haystack = [
    typeof e.message === 'string' ? e.message : '',
    typeof e.name === 'string' ? e.name : '',
    typeof e.code === 'string' ? e.code : '',
  ]
    .join(' | ')
    .toLowerCase();
  if (
    haystack.includes('identity already exists') ||
    haystack.includes('email_exists') ||
    haystack.includes('email already exists') ||
    haystack.includes('user already registered')
  ) {
    return { kind: 'account_exists' };
  }
  return { kind: 'other' };
}

/**
 * UPSERT a plan_members row keyed on (plan_id, user_id). Role comes from the
 * invite_tokens row referenced by app_metadata.invite_token_id (D-13); falls
 * back to 'viewer' when the lookup fails or no token id is present.
 *
 * Relies on Plan 01-02's UNIQUE(plan_id, user_id) constraint to make the
 * upsert idempotent under concurrent callback hits.
 */
export async function upsertPlanMembershipFromAppMeta(
  admin: SupabaseClient,
  userId: string,
  appMeta: { plan_id?: string; invite_token_id?: string }
): Promise<{ ok: boolean; role: 'owner' | 'editor' | 'viewer' }> {
  if (!appMeta.plan_id) {
    return { ok: false, role: 'viewer' };
  }

  let role: 'owner' | 'editor' | 'viewer' = 'viewer';
  if (appMeta.invite_token_id) {
    const tokenLookup = await admin
      .from('invite_tokens')
      .select('role')
      .eq('id', appMeta.invite_token_id)
      .maybeSingle();
    const raw = (tokenLookup.data as { role?: string } | null)?.role;
    if (raw === 'owner' || raw === 'editor' || raw === 'viewer') {
      role = raw;
    }
  }

  const { error } = await admin.from('plan_members').upsert(
    {
      plan_id: appMeta.plan_id,
      user_id: userId,
      role,
      joined_via_token_id: appMeta.invite_token_id ?? null,
    },
    { onConflict: 'plan_id,user_id', ignoreDuplicates: true }
  );

  return { ok: !error, role };
}
