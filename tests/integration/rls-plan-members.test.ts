// RLS isolation tests for the plan_members table.

import { beforeAll, describe, expect, it } from 'vitest';

import {
  SEED_OTHER_EMAIL,
  SEED_OTHER_ID,
  SEED_OTHER_PASSWORD,
  SEED_OWNER_ID,
  SEED_PLAN_ID,
  adminClient,
  anonClient,
  anonClientWithPlanClaim,
  getSkipReason,
  signInAs,
} from './_helpers';

describe('RLS: plan_members table', () => {
  let skip: string | null = null;

  beforeAll(async () => {
    skip = await getSkipReason();
    if (skip) console.warn(`[skip] ${skip}`);
  });

  it('anon WITH correct plan_id claim sees the owner row', async () => {
    if (skip) return;
    const client = await anonClientWithPlanClaim(SEED_PLAN_ID);
    const { data, error } = await client
      .from('plan_members')
      .select('user_id, role')
      .eq('plan_id', SEED_PLAN_ID);
    expect(error).toBeNull();
    expect(data?.some((m) => m.user_id === SEED_OWNER_ID && m.role === 'owner')).toBe(true);
  });

  it('anon with wrong claim sees zero plan_members rows', async () => {
    if (skip) return;
    const client = await anonClientWithPlanClaim(
      '00000000-0000-0000-0000-0000000000ff',
    );
    const { data } = await client.from('plan_members').select('user_id');
    expect(data ?? []).toHaveLength(0);
  });

  it('anon without claim sees zero plan_members rows', async () => {
    if (skip) return;
    const { data } = await anonClient().from('plan_members').select('user_id');
    expect(data ?? []).toHaveLength(0);
  });

  it('authenticated user CAN insert their own plan_members row', async () => {
    if (skip) return;
    const { client, session } = await signInAs(SEED_OTHER_EMAIL, SEED_OTHER_PASSWORD);
    const userId = session?.user.id;
    expect(userId).toBe(SEED_OTHER_ID);

    // Clean any prior row from earlier test runs.
    await adminClient()
      .from('plan_members')
      .delete()
      .eq('plan_id', SEED_PLAN_ID)
      .eq('user_id', SEED_OTHER_ID);

    const { data, error } = await client
      .from('plan_members')
      .insert({ plan_id: SEED_PLAN_ID, user_id: userId, role: 'viewer' })
      .select('id')
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();

    // Cleanup so the next test run starts clean.
    if (data?.id)
      await adminClient().from('plan_members').delete().eq('id', data.id);
  });

  it('authenticated user CANNOT insert a row with a different user_id', async () => {
    if (skip) return;
    const { client } = await signInAs(SEED_OTHER_EMAIL, SEED_OTHER_PASSWORD);
    const { data, error } = await client
      .from('plan_members')
      .insert({
        plan_id: SEED_PLAN_ID,
        user_id: SEED_OWNER_ID, // impersonating the owner — must be blocked
        role: 'editor',
      })
      .select('id');
    // RLS WITH CHECK fails — Supabase returns either error or empty data.
    if (!error) {
      expect(data ?? []).toHaveLength(0);
    } else {
      expect(error.message.toLowerCase()).toContain('row');
    }
  });

  it('authenticated non-member cannot UPDATE another member row', async () => {
    if (skip) return;
    const { client } = await signInAs(SEED_OTHER_EMAIL, SEED_OTHER_PASSWORD);
    const { data } = await client
      .from('plan_members')
      .update({ role: 'editor' })
      .eq('plan_id', SEED_PLAN_ID)
      .eq('user_id', SEED_OWNER_ID)
      .select('id');
    expect(data ?? []).toHaveLength(0);
    const { data: owner } = await adminClient()
      .from('plan_members')
      .select('role')
      .eq('plan_id', SEED_PLAN_ID)
      .eq('user_id', SEED_OWNER_ID)
      .single();
    expect(owner?.role).toBe('owner');
  });
});
