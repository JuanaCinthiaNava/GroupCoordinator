// Plan view RSC (Surface 3 anonymous / Surface 4 authenticated).
//
// Renders the seeded or user-created plan by slug. RLS gates the read — the
// caller must be an anon user with app_metadata.plan_id matching this plan's
// id, an authenticated owner, OR an authenticated member.
//
// CP-1 mitigation: anonymous viewers see the full read-only artifact (no
// grayed-out edit affordances). The bottom sign-in bar is the only auth
// affordance on this surface.

import { EmptyPlanState } from '@/components/plan/EmptyPlanState';
import { MemberChipList } from '@/components/plan/MemberChipList';
import { PlanHero } from '@/components/plan/PlanHero';
import { PoweredByFooter } from '@/components/plan/PoweredByFooter';
import { SignInAffordanceBar } from '@/components/plan/SignInAffordanceBar';
import { getPlanBySlug, getPlanMembers } from '@/lib/db/queries/plans';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

export const metadata: Metadata = { robots: 'noindex, nofollow' };

interface UserDisplayMeta {
  full_name?: string;
  name?: string;
  email?: string;
}

async function resolveDisplayNames(userIds: ReadonlyArray<string>): Promise<Map<string, string>> {
  // auth.users is not RLS-readable by anon — we resolve via service-role.
  // This is a server-only path (page is RSC) so no leak risk to the client.
  if (userIds.length === 0) return new Map();
  const admin = createServiceRoleClient();
  const out = new Map<string, string>();
  await Promise.all(
    userIds.map(async (id) => {
      try {
        const { data, error } = await admin.auth.admin.getUserById(id);
        if (error || !data.user) return;
        const meta = (data.user.user_metadata ?? {}) as UserDisplayMeta;
        const candidate = meta.full_name ?? meta.name ?? data.user.email?.split('@')[0] ?? '';
        if (candidate) out.set(id, candidate);
      } catch {
        // Best-effort — fall back to empty (handled by callers).
      }
    })
  );
  return out;
}

export default async function PlanViewPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plan = await getPlanBySlug(supabase, slug);
  if (!plan) notFound();

  const members = await getPlanMembers(supabase, plan.id);
  const ownerRow = members.find((m) => m.role === 'owner');
  const userIds = Array.from(
    new Set([...(ownerRow ? [ownerRow.user_id] : []), ...members.map((m) => m.user_id)])
  );
  const nameMap = await resolveDisplayNames(userIds);
  const creatorName = ownerRow
    ? (nameMap.get(ownerRow.user_id) ?? t('common.loading'))
    : t('common.loading');

  const memberDisplays = members.map((m) => ({
    user_id: m.user_id,
    display_name: nameMap.get(m.user_id) ?? '?',
  }));

  const isAnonymous = !user || user.is_anonymous === true;

  return (
    <>
      <PlanHero plan={plan} creatorName={creatorName} locale={locale} />
      <MemberChipList members={memberDisplays} />
      {members.length <= 1 ? <EmptyPlanState creatorName={creatorName} /> : null}
      {isAnonymous ? <SignInAffordanceBar nextPath={`/plan/${plan.slug}`} /> : null}
      <PoweredByFooter />
    </>
  );
}
