// /me dashboard query — RLS-bound. PLAN-06.
//
// Returns the plans the user is a member of OR owns, ordered by updated_at
// DESC (PLAN-06). RLS does the actual filtering via the plans_select_member
// policy from Plan 01-02; we additionally filter archived_at IS NULL because
// archived plans should not appear on /me.
//
// Phase 7 optimization: the member_count is fetched per-plan via an N+1
// loop (acceptable in v1 — typical user has <20 plans). When the data set
// grows we should denormalize plan_members.count into the plans table or
// expose a Postgres RPC that returns counts in one shot.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface MyPlansRow {
  id: string;
  slug: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  ownerId: string;
  updatedAt: string;
  isOwner: boolean;
  memberCount: number;
  hasActiveToken: boolean;
}

interface RawPlanRow {
  id: string;
  slug: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  owner_id: string;
  archived_at: string | null;
  updated_at: string;
}

/**
 * Fetch the user's plans (owner or member). Returns ordered by
 * updated_at DESC (PLAN-06). RLS filters automatically.
 */
export async function getMyPlans(supabase: SupabaseClient, userId: string): Promise<MyPlansRow[]> {
  // Two separate queries because Supabase JS does not express UNION ergonomically:
  //   (a) plans the user owns
  //   (b) plans the user is a member of (via plan_members FK)
  // Then merge + de-dupe in JS.
  const [ownerResult, memberResult] = await Promise.all([
    supabase
      .from('plans')
      .select('id, slug, title, start_date, end_date, owner_id, archived_at, updated_at')
      .eq('owner_id', userId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('plan_members')
      .select(
        'plan_id, plans!inner(id, slug, title, start_date, end_date, owner_id, archived_at, updated_at)'
      )
      .eq('user_id', userId),
  ]);
  if (ownerResult.error) throw ownerResult.error;
  if (memberResult.error) throw memberResult.error;

  const memberPlans: RawPlanRow[] = (memberResult.data ?? [])
    .map((row) => {
      const r = row as unknown as { plan_id: string; plans: RawPlanRow };
      return r.plans;
    })
    .filter((p): p is RawPlanRow => !!p && p.archived_at === null);

  const seen = new Set<string>();
  const merged: RawPlanRow[] = [];
  for (const p of [...(ownerResult.data ?? []), ...memberPlans]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      merged.push(p);
    }
  }
  // PLAN-06: order by updated_at DESC. Both source queries are already sorted
  // but the merge can interleave, so we re-sort.
  merged.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));

  // N+1 enrichment (member_count + hasActiveToken). Acceptable for Phase 1.
  const enriched: MyPlansRow[] = await Promise.all(
    merged.map(async (p) => {
      const [{ count: memberCount }, tokenLookup] = await Promise.all([
        supabase
          .from('plan_members')
          .select('id', { count: 'exact', head: true })
          .eq('plan_id', p.id),
        // Only owners can read invite_tokens (Plan 01-02 RLS). For non-owners
        // this returns 0 rows, which is the correct semantic: hasActiveToken
        // is an owner-facing affordance.
        supabase
          .from('invite_tokens')
          .select('id', { count: 'exact', head: true })
          .eq('plan_id', p.id)
          .is('revoked_at', null),
      ]);
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        startDate: p.start_date,
        endDate: p.end_date,
        ownerId: p.owner_id,
        updatedAt: p.updated_at,
        isOwner: p.owner_id === userId,
        memberCount: memberCount ?? 0,
        hasActiveToken: (tokenLookup.count ?? 0) > 0,
      };
    })
  );

  return enriched;
}
