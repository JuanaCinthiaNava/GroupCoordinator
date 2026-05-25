'use server';

// Plan-lifecycle Server Actions.
//
// CONTRACT:
// - All actions are authenticated. getRequiredUser redirects to
//   /auth/sign-in?next=… when there is no real session (anonymous users included
//   — anonymous tokens get a JWT but cannot create plans).
// - DB writes go through the RLS-bound Supabase server client. The
//   plans_insert_authenticated policy enforces `owner_id = auth.uid()`; we DO
//   NOT use elevated-privilege bypass clients here. RLS is the security
//   source of truth.
// - createPlan creates THREE rows atomically (best effort — Supabase JS does
//   not expose a single multi-table transaction, so we do three sequential
//   INSERTs and rely on RLS + FK cascades to keep them consistent):
//     1) plans  (returns row with id + slug)
//     2) plan_members (role='owner', joined_via_token_id=null)
//     3) invite_tokens via mintInviteToken helper (role='viewer')
//   If step 2 fails after step 1, the plan still exists but has no owner-
//   membership row — RLS prevents anyone from accessing it. Documented in
//   SUMMARY as a known compromise (Pitfall reference; full SQL TX is a Phase 7
//   upgrade when we move write paths into Postgres functions).
// - On success, redirect('/plan/[slug]?share=1') triggers Surface 2 auto-open.

import { generateSlug } from '@/lib/auth/invite-token';
import { getRequiredUser } from '@/lib/auth/require-user';
import { createServerClient } from '@/lib/supabase/server';
import { createPlanSchema } from '@/lib/validation/plan';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { mintInviteTokenInternal } from './invite-token';

export interface CreatePlanError {
  error: {
    formErrors?: string[];
    fieldErrors?: Record<string, string[]>;
    message?: string;
  };
}

export async function createPlan(formData: FormData): Promise<CreatePlanError | never> {
  // 1) Server-side Zod re-validation (defense-in-depth against the client form).
  const raw = {
    title: (formData.get('title') ?? '').toString(),
    startDate: ((formData.get('startDate') ?? '') as string) || undefined,
    endDate: ((formData.get('endDate') ?? '') as string) || undefined,
    description: ((formData.get('description') ?? '') as string) || undefined,
  };
  const parsed = createPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  // 2) Auth gate. AUTH-06: only signed-in (non-anonymous) users can mint plans.
  const cookieStore = await cookies();
  const user = await getRequiredUser(cookieStore, '/plan/new');
  const supabase = createServerClient(cookieStore);

  // 3) Insert plans row via RLS — plans_insert_authenticated enforces owner_id.
  const slug = generateSlug();
  const startDate =
    parsed.data.startDate && parsed.data.startDate !== '' ? parsed.data.startDate : null;
  const endDate = parsed.data.endDate && parsed.data.endDate !== '' ? parsed.data.endDate : null;
  const description =
    parsed.data.description && parsed.data.description !== '' ? parsed.data.description : null;

  const planInsert = await supabase
    .from('plans')
    .insert({
      slug,
      title: parsed.data.title,
      description,
      start_date: startDate,
      end_date: endDate,
      owner_id: user.id,
    })
    .select('id, slug')
    .single();

  if (planInsert.error || !planInsert.data) {
    return { error: { message: planInsert.error?.message ?? 'plan insert failed' } };
  }
  const plan = planInsert.data as { id: string; slug: string };

  // 4) Insert plan_members row with role='owner' (D-13). RLS allows the owner
  //    to insert their own membership row per plan_members_insert_self_or_owner.
  const memberInsert = await supabase.from('plan_members').insert({
    plan_id: plan.id,
    user_id: user.id,
    role: 'owner',
  });
  if (memberInsert.error) {
    // The plan exists but is now ownerless from a membership standpoint.
    // RLS still permits the owner (owner_id) to read it because plans_select_member
    // checks owner_id OR membership; this is documented but worth surfacing.
    return { error: { message: memberInsert.error.message } };
  }

  // 5) Mint the default viewer invite token. Server-internal call (skips the
  //    extra auth check inside mintInviteToken — we already have the user).
  const tokenResult = await mintInviteTokenInternal(supabase, plan.id, 'viewer', user.id);
  if ('error' in tokenResult) {
    return { error: { message: tokenResult.error } };
  }

  // 6) Redirect to /plan/[slug]?share=1 — Surface 2 auto-open trigger (D-07).
  redirect(`/plan/${plan.slug}?share=1`);
}

// PLAN-02 stub: implemented in Plan 01-06 — not yet implemented.
export async function updatePlan(_planId: string, _formData: FormData): Promise<never> {
  // implemented in Plan 01-06 — not yet implemented
  throw new Error('updatePlan: not yet implemented — Plan 01-06');
}

// PLAN-05 stub: implemented in Plan 01-06 — not yet implemented.
export async function archivePlan(_planId: string): Promise<never> {
  // implemented in Plan 01-06 — not yet implemented
  throw new Error('archivePlan: not yet implemented — Plan 01-06');
}
