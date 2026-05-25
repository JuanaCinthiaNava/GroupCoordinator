'use server';

// Invite-token Server Actions.
//
// CONTRACT:
// - mintInviteToken is the public Server Action — authenticated owners only.
//   RLS policy invite_tokens_insert_owner enforces that created_by must match
//   auth.uid() AND that the caller owns the plan (joined via plans_select_member).
// - mintInviteTokenInternal is an unexported (server-only) helper used by
//   createPlan to avoid re-authenticating; it accepts the already-authenticated
//   user id + the same RLS-bound supabase client.
// - revokeInviteToken is a Plan 01-06 stub.

import { generateToken } from '@/lib/auth/invite-token';
import { getRequiredUser } from '@/lib/auth/require-user';
import { createServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export interface MintInviteTokenResult {
  id: string;
  token: string;
  role: string;
}

export interface MintInviteTokenError {
  error: string;
}

/** Server-internal mint — used by createPlan after it already authenticated. */
export async function mintInviteTokenInternal(
  supabase: SupabaseClient,
  planId: string,
  role: 'viewer' | 'editor',
  userId: string
): Promise<MintInviteTokenResult | MintInviteTokenError> {
  const token = generateToken();
  const { data, error } = await supabase
    .from('invite_tokens')
    .insert({
      plan_id: planId,
      token,
      role,
      created_by: userId,
    })
    .select('id, token, role')
    .single();
  if (error || !data) {
    return { error: error?.message ?? 'invite_tokens insert failed' };
  }
  return data as MintInviteTokenResult;
}

/** Public Server Action — authenticated owners only. */
export async function mintInviteToken(
  planId: string,
  role: 'viewer' | 'editor' = 'viewer'
): Promise<MintInviteTokenResult | MintInviteTokenError> {
  const cookieStore = await cookies();
  const user = await getRequiredUser(cookieStore, `/plan/${planId}/settings`);
  const supabase = createServerClient(cookieStore);
  return mintInviteTokenInternal(supabase, planId, role, user.id);
}

// PLAN-04 stub: implemented in Plan 01-06 — not yet implemented.
export async function revokeInviteToken(_tokenId: string): Promise<never> {
  // implemented in Plan 01-06 — not yet implemented
  throw new Error('revokeInviteToken: not yet implemented — Plan 01-06');
}
