// Plan view RSC (Surface 3 anonymous / Surface 4 authenticated).
//
// Renders the seeded or user-created plan by slug. RLS gates the read — the
// caller must be an anon user with app_metadata.plan_id matching this plan's
// id, an authenticated owner, OR an authenticated member.
//
// Plan 01-04 additions:
//  - Mount PlanHeader with plan + members (owner gear icon, member stack,
//    avatar dropdown for authenticated viewers).
//  - When ?share=1 AND viewer is the owner, fetch the most-recent invite_token
//    and mount <ShareDialogTrigger openOnMount> — Surface 2 auto-open per D-07.
//  - Hide SignInAffordanceBar from the DOM when the user is authenticated
//    (CP-1 mitigation: NOT just CSS-hidden — conditional render).
//  - OG metadata via generateMetadata: openGraph.images + twitter.images both
//    point at /api/og/[plan_slug] (D-09).
//
// CP-1 mitigation: anonymous viewers see the full read-only artifact (no
// grayed-out edit affordances). The bottom sign-in bar is the only auth
// affordance on this surface.

import { EmptyPlanState } from '@/components/plan/EmptyPlanState';
import { MemberChipList } from '@/components/plan/MemberChipList';
import { PlanHeader } from '@/components/plan/PlanHeader';
import { PlanHero } from '@/components/plan/PlanHero';
import { PoweredByFooter } from '@/components/plan/PoweredByFooter';
import { ShareDialogTrigger } from '@/components/plan/ShareDialogTrigger';
import { SignInAffordanceBar } from '@/components/plan/SignInAffordanceBar';
import { getPlanBySlug, getPlanMembers } from '@/lib/db/queries/plans';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const ogUrl = siteUrl ? `${siteUrl}/api/og/${slug}` : `/api/og/${slug}`;
  return {
    robots: 'noindex, nofollow',
    openGraph: {
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      images: [ogUrl],
    },
  };
}

export default async function PlanViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
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
    new Set([
      ...(ownerRow ? [ownerRow.user_id] : []),
      ...members.map((m) => m.user_id),
      ...(user ? [user.id] : []),
    ])
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
  const isAuthenticated = !!user && !isAnonymous;
  const isOwner = isAuthenticated && user.id === plan.owner_id;

  // Surface 2 auto-open — owner + ?share=1 only. Fetch the most-recent invite
  // token via the RLS-bound supabase client; invite_tokens RLS permits only
  // the owner to SELECT, which doubles as a gate against non-owners landing
  // on /plan/[slug]?share=1.
  const shareParam = sp.share;
  const shouldAutoShare = isOwner && (shareParam === '1' || shareParam === 'true');
  let mostRecentInviteToken: string | null = null;
  if (shouldAutoShare) {
    const tokenLookup = await supabase
      .from('invite_tokens')
      .select('token')
      .eq('plan_id', plan.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ token: string }>();
    mostRecentInviteToken = tokenLookup.data?.token ?? null;
  }

  const userForHeader = user
    ? {
        id: user.id,
        isAnonymous: user.is_anonymous === true,
        displayName: nameMap.get(user.id) ?? '',
      }
    : null;
  const headerPlan = { slug: plan.slug, title: plan.title, owner_id: plan.owner_id };

  return (
    <>
      <PlanHeader
        currentPath={`/plan/${plan.slug}`}
        user={userForHeader}
        plan={headerPlan}
        members={memberDisplays}
      />
      <PlanHero plan={plan} creatorName={creatorName} locale={locale} />
      <MemberChipList members={memberDisplays} />
      {members.length <= 1 ? <EmptyPlanState creatorName={creatorName} /> : null}
      {isAnonymous ? <SignInAffordanceBar nextPath={`/plan/${plan.slug}`} /> : null}
      <PoweredByFooter />
      {mostRecentInviteToken ? (
        <ShareDialogTrigger
          planTitle={plan.title}
          inviteToken={mostRecentInviteToken}
          openOnMount={true}
          hideTrigger={true}
        />
      ) : null}
    </>
  );
}
