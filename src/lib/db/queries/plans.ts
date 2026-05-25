// Plan query helpers — RLS-bound.
//
// CONTRACT:
// - All helpers accept a Supabase client (server or browser) which carries the
//   caller's session. RLS filters rows automatically; the WHERE clauses we add
//   are for clarity and to keep result sets small, not for security.
// - For service-role / seed / migration contexts, use Drizzle directly via
//   drizzle/db.ts (those paths bypass RLS by definition).
// - Display name is NOT denormalized (D-21, MP-3 GDPR pseudonymization).
//   getPlanMembers returns user_id; resolve display name at render time from
//   the joined auth.users row.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface PlanRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  owner_id: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanMemberRow {
  id: string;
  plan_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  joined_via_token_id: string | null;
  joined_at: string;
}

/**
 * Fetch a single plan by slug. Returns null when the caller cannot see it
 * (either RLS filtered it out, or it does not exist; the two cases are
 * deliberately indistinguishable per defense-in-depth).
 */
export async function getPlanBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<PlanRow | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<PlanRow>();
  if (error) throw error;
  return data ?? null;
}

/**
 * Plans the user owns OR is a member of. RLS does the actual filtering;
 * we additionally scope by owner_id OR membership for clarity in pgAdmin.
 */
export async function getMyPlans(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlanRow[]> {
  // Two queries (owner + member) merged client-side to avoid a SQL UNION
  // that the Supabase JS SDK does not express ergonomically.
  const [ownerResult, memberResult] = await Promise.all([
    supabase
      .from('plans')
      .select('*')
      .eq('owner_id', userId)
      .is('archived_at', null),
    supabase
      .from('plan_members')
      .select('plan_id, plans!inner(*)')
      .eq('user_id', userId),
  ]);
  if (ownerResult.error) throw ownerResult.error;
  if (memberResult.error) throw memberResult.error;

  // Supabase JS infers nested relations as arrays even when the FK is one-to-one;
  // unwrap via unknown to keep the runtime shape (a single embedded row).
  const memberPlans = (memberResult.data ?? []).map((row) => {
    const r = row as unknown as { plan_id: string; plans: PlanRow };
    return r.plans;
  });

  const seen = new Set<string>();
  const merged: PlanRow[] = [];
  for (const p of [...(ownerResult.data ?? []), ...memberPlans]) {
    if (!seen.has(p.id) && !p.archived_at) {
      seen.add(p.id);
      merged.push(p);
    }
  }
  merged.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  return merged;
}

/**
 * Members of a plan. Display name resolved at render from auth.users.user_metadata
 * via the embedded relation (Postgres FK auth.users.id -> plan_members.user_id is
 * declared at the SQL level, not in Drizzle).
 */
export async function getPlanMembers(
  supabase: SupabaseClient,
  planId: string,
): Promise<PlanMemberRow[]> {
  const { data, error } = await supabase
    .from('plan_members')
    .select('*')
    .eq('plan_id', planId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanMemberRow[];
}
