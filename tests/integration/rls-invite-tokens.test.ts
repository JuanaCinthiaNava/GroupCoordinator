// RLS isolation tests for the invite_tokens table.
//
// invite_tokens is the most sensitive table — anon enumeration would let an
// attacker discover tokens for other plans (threat T-02-02). Tests prove:
//   - anon (with or without claim) reads ZERO rows
//   - authenticated owner can SELECT, INSERT, UPDATE for their plan
//   - authenticated non-owner reads ZERO rows
//   - DELETE is blocked at policy level (no DELETE policy → default deny)

import { beforeAll, describe, expect, it } from 'vitest';

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

const VALID_NO_LOOKALIKE = '23456789abcdefghjkmnpqrstuvwxyz';

function freshToken(): string {
  let out = '';
  for (let i = 0; i < 22; i++)
    out += VALID_NO_LOOKALIKE[Math.floor(Math.random() * VALID_NO_LOOKALIKE.length)];
  return out;
}

describe('RLS: invite_tokens table', () => {
  let skip: string | null = null;

  beforeAll(async () => {
    skip = await getSkipReason();
    if (skip) console.warn(`[skip] ${skip}`);
  });

  it('anon WITHOUT claim cannot read any invite_tokens row', async () => {
    if (skip) return;
    const { data } = await anonClient().from('invite_tokens').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('anon WITH matching plan_id claim still cannot read invite_tokens', async () => {
    if (skip) return;
    // anon role was deliberately NOT granted SELECT on invite_tokens — proves
    // T-02-02 mitigation: anon link-viewers never enumerate tokens even with
    // a valid plan_id claim.
    const client = await anonClientWithPlanClaim(SEED_PLAN_ID);
    const { data } = await client.from('invite_tokens').select('id');
    expect(data ?? []).toHaveLength(0);
  });

  it('owner CAN select, insert, update invite_tokens for own plan', async () => {
    if (skip) return;
    const { client, session } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    expect(session?.user.id).toBe(SEED_OWNER_ID);

    // SELECT
    const { data: existing, error: selErr } = await client
      .from('invite_tokens')
      .select('id, plan_id, revoked_at')
      .eq('plan_id', SEED_PLAN_ID);
    expect(selErr).toBeNull();
    expect((existing ?? []).length).toBeGreaterThanOrEqual(3);

    // INSERT
    const token = freshToken();
    const { data: created, error: insErr } = await client
      .from('invite_tokens')
      .insert({
        plan_id: SEED_PLAN_ID,
        token,
        role: 'viewer',
        created_by: session?.user.id,
      })
      .select('id')
      .single();
    expect(insErr).toBeNull();
    expect(created?.id).toBeTruthy();

    // UPDATE (revoke)
    if (created?.id) {
      const { data: updated, error: updErr } = await client
        .from('invite_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', created.id)
        .select('id, revoked_at')
        .single();
      expect(updErr).toBeNull();
      expect(updated?.revoked_at).toBeTruthy();
      // Cleanup
      await adminClient().from('invite_tokens').delete().eq('id', created.id);
    }
  });

  it('authenticated NON-owner cannot SELECT or UPDATE invite_tokens', async () => {
    if (skip) return;
    const { client } = await signInAs(SEED_OTHER_EMAIL, SEED_OTHER_PASSWORD);
    const { data: rows } = await client
      .from('invite_tokens')
      .select('id')
      .eq('plan_id', SEED_PLAN_ID);
    expect(rows ?? []).toHaveLength(0);

    const { data: updated } = await client
      .from('invite_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('plan_id', SEED_PLAN_ID)
      .select('id');
    expect(updated ?? []).toHaveLength(0);
  });

  it('DELETE attempt by owner affects zero rows (no DELETE policy)', async () => {
    if (skip) return;
    const { client } = await signInAs(SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD);
    const { data, error } = await client
      .from('invite_tokens')
      .delete()
      .eq('plan_id', SEED_PLAN_ID)
      .select('id');
    // Supabase returns either an error or empty data when no DELETE policy applies.
    if (!error) {
      expect(data ?? []).toHaveLength(0);
    }
    // Confirm seed tokens still present.
    const { count } = await adminClient()
      .from('invite_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', SEED_PLAN_ID);
    expect(count ?? 0).toBeGreaterThanOrEqual(3);
  });
});
