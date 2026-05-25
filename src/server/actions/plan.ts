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
import { archivePlanSchema, createPlanSchema, updatePlanSchema } from '@/lib/validation/plan';
import { revalidatePath } from 'next/cache';
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

/**
 * PLAN-02: Edit plan details from Surface 6 — title, dates, description.
 *
 * Auth: owner only — RLS plans_update_owner_only enforces. Non-owners hit a
 * zero-rows-updated result and we surface a generic error.
 * Returns { error } on validation failure or RLS-blocked update; otherwise
 * revalidates /plan/[slug] + /me and returns void.
 */
export async function updatePlan(formData: FormData): Promise<CreatePlanError | undefined> {
  const raw = {
    planId: (formData.get('planId') ?? '').toString(),
    title: (formData.get('title') ?? '').toString(),
    startDate: ((formData.get('startDate') ?? '') as string) || undefined,
    endDate: ((formData.get('endDate') ?? '') as string) || undefined,
    description: ((formData.get('description') ?? '') as string) || undefined,
  };
  const parsed = updatePlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const cookieStore = await cookies();
  // On auth failure, return the user to /me (their dashboard). We don't know
  // the plan's slug here without an extra query, and /plan alone 404s. /me is
  // the canonical landing for a signed-out owner.
  const user = await getRequiredUser(cookieStore, '/me');
  const supabase = createServerClient(cookieStore);

  const startDate =
    parsed.data.startDate && parsed.data.startDate !== '' ? parsed.data.startDate : null;
  const endDate = parsed.data.endDate && parsed.data.endDate !== '' ? parsed.data.endDate : null;
  const description =
    parsed.data.description && parsed.data.description !== '' ? parsed.data.description : null;

  const result = await supabase
    .from('plans')
    .update({
      title: parsed.data.title,
      description,
      start_date: startDate,
      end_date: endDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.planId)
    .select('slug')
    .maybeSingle<{ slug: string }>();

  if (result.error) {
    return { error: { message: result.error.message } };
  }
  if (!result.data) {
    // RLS blocked the update — caller isn't the owner (or plan doesn't exist).
    // Use a generic error to avoid leaking existence.
    return { error: { message: 'plan_update_forbidden' } };
  }

  // Track the authenticated edit (no functional dependency on user.id —
  // RLS already enforced ownership). Reference to keep biome happy.
  void user.id;

  revalidatePath(`/plan/${result.data.slug}`);
  revalidatePath(`/plan/${result.data.slug}/settings`);
  revalidatePath('/me');
}

/**
 * PLAN-05: D-05 soft-delete plan. The Surface 6 "Eliminar plan" button is the
 * same code path as "Archivar plan" — both set archived_at = now() (RESEARCH
 * §Open Question 5).
 *
 * Auth: owner only — RLS plans_update_owner_only enforces. Redirects to /me
 * after success so the owner lands on the dashboard with the archived plan
 * already filtered out (Plan 01-05's getMyPlans uses archived_at IS NULL).
 */
export async function archivePlan(formData: FormData): Promise<CreatePlanError | never> {
  const raw = { planId: (formData.get('planId') ?? '').toString() };
  const parsed = archivePlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const cookieStore = await cookies();
  const user = await getRequiredUser(cookieStore, '/me');
  const supabase = createServerClient(cookieStore);

  const result = await supabase
    .from('plans')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.planId)
    .select('slug')
    .maybeSingle<{ slug: string }>();

  if (result.error) {
    return { error: { message: result.error.message } };
  }
  if (!result.data) {
    // RLS blocked the update — non-owner or non-existent plan.
    return { error: { message: 'plan_archive_forbidden' } };
  }

  void user.id; // see updatePlan for rationale

  revalidatePath('/me');
  revalidatePath(`/plan/${result.data.slug}`);
  revalidatePath(`/plan/${result.data.slug}/settings`);
  redirect('/me');
}
