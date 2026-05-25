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
import { renameTokenSchema, revokeTokenSchema } from '@/lib/validation/plan';
import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
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

export interface RevokeInviteTokenError {
  error: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
}

/**
 * PLAN-04: owner revokes an invite token (D-04 — set revoked_at = now()).
 *
 * Soft-delete: revoked tokens stay in invite_tokens for audit (no DELETE
 * policy). The /api/invite/[token] handler shipped in Plan 01-03 already
 * filters revoked_at IS NOT NULL → 302 /errors/token-revoked, so any future
 * paste of the leaked link lands on the revoked-error page (PLAN-04 success
 * criterion). RLS invite_tokens_update_owner enforces ownership.
 */
export async function revokeInviteToken(
  formData: FormData
): Promise<RevokeInviteTokenError | undefined> {
  const raw = { tokenId: (formData.get('tokenId') ?? '').toString() };
  const parsed = revokeTokenSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const cookieStore = await cookies();
  // The settings page resolves the slug; for the redirect target we fall back
  // to /me — if revoke succeeds we return to the same settings page anyway via
  // revalidatePath. A signed-out user is bounced to sign-in with /me as the
  // post-auth landing.
  const user = await getRequiredUser(cookieStore, '/me');
  const supabase = createServerClient(cookieStore);

  // The embedded `plans(slug)` projection serves two purposes:
  // 1. RLS scope: invite_tokens_update_owner also gates the SELECT side, so
  //    the join only returns when the caller owns the plan.
  // 2. revalidatePath target for the settings page.
  const result = await supabase
    .from('invite_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', parsed.data.tokenId)
    .select('plan_id, plans!inner(slug)')
    .maybeSingle();

  if (result.error) {
    return { error: result.error.message };
  }
  if (!result.data) {
    // RLS blocked or token doesn't exist — generic error to avoid existence
    // leakage.
    return { error: 'token_revoke_forbidden' };
  }

  void user.id; // RLS already enforced; reference to keep biome happy

  // Supabase JS infers the joined relation as an array even for one-to-one
  // FKs; unwrap defensively.
  const row = result.data as unknown as {
    plan_id: string;
    plans: { slug: string } | Array<{ slug: string }>;
  };
  const plansRel = Array.isArray(row.plans) ? row.plans[0] : row.plans;
  const slug = plansRel?.slug;
  if (slug) {
    revalidatePath(`/plan/${slug}/settings`);
  }
}

/**
 * PLAN-04: owner renames an invite token. Only the `name` column is updated;
 * the token value itself is never touched (T-06-03 mitigation).
 */
export async function renameInviteToken(
  formData: FormData
): Promise<RevokeInviteTokenError | undefined> {
  const raw = {
    tokenId: (formData.get('tokenId') ?? '').toString(),
    name: (formData.get('name') ?? '').toString(),
  };
  const parsed = renameTokenSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const cookieStore = await cookies();
  const user = await getRequiredUser(cookieStore, '/me');
  const supabase = createServerClient(cookieStore);

  const result = await supabase
    .from('invite_tokens')
    .update({ name: parsed.data.name })
    .eq('id', parsed.data.tokenId)
    .select('plan_id, plans!inner(slug)')
    .maybeSingle();

  if (result.error) {
    return { error: result.error.message };
  }
  if (!result.data) {
    return { error: 'token_rename_forbidden' };
  }

  void user.id;

  const row = result.data as unknown as {
    plan_id: string;
    plans: { slug: string } | Array<{ slug: string }>;
  };
  const plansRel = Array.isArray(row.plans) ? row.plans[0] : row.plans;
  const slug = plansRel?.slug;
  if (slug) {
    revalidatePath(`/plan/${slug}/settings`);
  }
}
