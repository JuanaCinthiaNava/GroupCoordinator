// RLS isolation tests for the plans table.
// Persona matrix from PLAN 01-02 Task 3:
//   1. Anonymous WITHOUT plan_id claim
//   2. Anonymous WITH matching plan_id claim
//   3. Anonymous WITH non-matching plan_id claim
//   4. Authenticated owner
//   5. Authenticated non-owner (cross-RLS isolation)
//
// Skips gracefully when the local Supabase stack is not running.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  SEED_OTHER_EMAIL,
  SEED_OTHER_PASSWORD,
  SEED_OWNER_EMAIL,
  SEED_OWNER_ID,
  SEED_OWNER_PASSWORD,
  SEED_PLAN_ID,
  adminClient,
  anonClient,
  anonClientWithPlanClaim,
  getSkipReason,
  signInAs,
} from './_helpers';

describe('RLS: plans table', () => {
  let skip: string | null = null;

  beforeAll(async () => {
    skip = await getSkipReason();
    if (skip) console.warn(`[skip] ${skip}`);
  });

  afterAll(async () => {
    // Clean up anonymous test users to keep auth.users from growing unbounded.
    if (skip) return;
    try {
      const admin = adminClient();
      const { data: users } = await admin.auth.admin.listUsers();
      for (const u of users?.users ?? []) {
        if (u.is_anonymous) {
          await admin.auth.admin.deleteUser(u.id);
        }
      }
    } catch {
      // Best-effort cleanup.
    }
  });

  it('anon WITHOUT plan_id claim sees zero plans', async () => {
    if (skip) return;
    const { data } = await anonClient().from('plans').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('anon WITH correct plan_id claim sees exactly the seed plan', async () => {
    if (skip) return;
    const client = await anonClientWithPlanClaim(SEED_PLAN_ID);
    const { data, error } = await client.from('plans').select('id');
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.id).toBe(SEED_PLAN_ID);
  });

  it('anon WITH non-matching plan_id claim sees zero plans', async () => {
    if (skip) return;
    const client = await anonClientWithPlanClaim(
      '00000000-0000-0000-0000-0000000000ff', // not the seed plan
    );
    const { data } = await client.from('plans').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('authenticated owner sees at least the seed plan', async () => {
    if (skip) return;
    const { client } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    const { data, error } = await client.from('plans').select('id, owner_id');
    expect(error).toBeNull();
    expect(data?.some((p) => p.id === SEED_PLAN_ID && p.owner_id === SEED_OWNER_ID)).toBe(
      true,
    );
  });

  it('authenticated owner can insert a new plan as themselves', async () => {
    if (skip) return;
    const { client, session } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    const userId = session?.user.id;
    expect(userId).toBe(SEED_OWNER_ID);
    const slug = `t${Date.now().toString(36)}`;
    const { data, error } = await client
      .from('plans')
      .insert({ slug, title: 'inserted-by-owner', owner_id: userId })
      .select('id')
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    // Cleanup
    if (data?.id) await adminClient().from('plans').delete().eq('id', data.id);
  });

  it('authenticated NON-owner cannot UPDATE the seed plan', async () => {
    if (skip) return;
    const { client } = await signInAs(SEED_OTHER_EMAIL, SEED_OTHER_PASSWORD);
    const { data, error } = await client
      .from('plans')
      .update({ title: 'illicit-overwrite' })
      .eq('id', SEED_PLAN_ID)
      .select('id');
    // RLS USING + WITH CHECK both filter — no error, just zero rows updated.
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
    // Confirm title unchanged.
    const { data: confirmed } = await adminClient()
      .from('plans')
      .select('title')
      .eq('id', SEED_PLAN_ID)
      .single();
    expect(confirmed?.title).not.toBe('illicit-overwrite');
  });
});
