// T-06-06 mitigation verification — Plan 01-06 Task 2.
//
// Asserts the application-layer `archived_at IS NULL` filter in
// getPlanBySlug correctly hides archived plans from:
//   A. Anonymous viewer with a valid plan_id JWT claim (RLS would still
//      permit the SELECT, so the filter is load-bearing)
//   B. Authenticated non-owner (even members)
//   C. Owner explicitly opts in via { allowArchived: true } (visible)
//   D. Owner with default args (still hidden — defensive)
//
// Skips cleanly when local Supabase is unreachable.

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  SEED_OTHER_EMAIL,
  SEED_OTHER_ID,
  SEED_OTHER_PASSWORD,
  SEED_OWNER_EMAIL,
  SEED_OWNER_PASSWORD,
  SEED_PLAN_ID,
  adminClient,
  anonClientWithPlanClaim,
  getSkipReason,
  signInAs,
} from './_helpers';

let skipReason: string | null = null;
let memberRowId: string | null = null;

beforeAll(async () => {
  skipReason = await getSkipReason();
  if (skipReason) return;
  // Pre-state: archive the seed plan via service-role.
  const admin = adminClient();
  await admin
    .from('plans')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', SEED_PLAN_ID);

  // Set up SEED_OTHER as a plan_member (for Case B).
  const memberInsert = await admin
    .from('plan_members')
    .insert({
      plan_id: SEED_PLAN_ID,
      user_id: SEED_OTHER_ID,
      role: 'viewer',
    })
    .select('id')
    .single();
  if (!memberInsert.error && memberInsert.data) {
    memberRowId = memberInsert.data.id as string;
  }
});

afterAll(async () => {
  if (skipReason) return;
  const admin = adminClient();
  // Restore archived_at.
  await admin
    .from('plans')
    .update({ archived_at: null })
    .eq('id', SEED_PLAN_ID);
  // Remove the test member row.
  if (memberRowId) {
    await admin.from('plan_members').delete().eq('id', memberRowId);
  }
});

afterEach(() => {
  // No mocks to reset; each case uses fresh clients.
});

describe('T-06-06 — archived plan access controls', () => {
  it('Case A: anon with valid plan_id claim → null (archived filter applied)', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }
    const { getPlanBySlug } = await import('@/lib/db/queries/plans');
    const anon = await anonClientWithPlanClaim(SEED_PLAN_ID);
    const result = await getPlanBySlug(anon, 'seed-plan');
    expect(result).toBeNull();
  });

  it('Case B: authenticated non-owner (member) → null (archived filter applied)', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }
    const { getPlanBySlug } = await import('@/lib/db/queries/plans');
    const { client } = await signInAs(SEED_OTHER_EMAIL, SEED_OTHER_PASSWORD);
    const result = await getPlanBySlug(client, 'seed-plan');
    expect(result).toBeNull();
  });

  it('Case C: authenticated owner with allowArchived: true → row visible', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }
    const { getPlanBySlug } = await import('@/lib/db/queries/plans');
    const { client } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    const result = await getPlanBySlug(client, 'seed-plan', { allowArchived: true });
    expect(result).not.toBeNull();
    expect(result?.id).toBe(SEED_PLAN_ID);
    expect(result?.archived_at).not.toBeNull();
  });

  it('Case D: authenticated owner with default args → null (defensive opt-in)', async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }
    const { getPlanBySlug } = await import('@/lib/db/queries/plans');
    const { client } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    const result = await getPlanBySlug(client, 'seed-plan');
    // Even the owner gets null with default args. Forces explicit opt-in at
    // the call site (only the settings page passes allowArchived: true).
    expect(result).toBeNull();
  });
});
