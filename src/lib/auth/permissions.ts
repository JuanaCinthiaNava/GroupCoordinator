// Permission helpers — PRESENTATIONAL GATING ONLY.
//
// RLS is the source of truth (D-18). These helpers decide which UI affordances
// to RENDER (e.g., "show the Revocar button only to the owner"), never whether
// an operation will succeed. A non-owner who somehow submits a revoke action
// is blocked at the database, not by these helpers.

export interface PlanLike {
  ownerId: string;
}

export interface MembershipLike {
  planId: string;
}

export function isOwner(
  plan: PlanLike | null | undefined,
  userId: string | null | undefined
): boolean {
  if (!plan || !userId) return false;
  return plan.ownerId === userId;
}

export function isMember(
  memberships: ReadonlyArray<MembershipLike> | null | undefined,
  planId: string | null | undefined
): boolean {
  if (!memberships || !planId) return false;
  return memberships.some((m) => m.planId === planId);
}
