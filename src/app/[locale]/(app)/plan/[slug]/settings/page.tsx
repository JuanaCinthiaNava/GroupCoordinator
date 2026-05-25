// Plan settings page — Surface 6 (RSC).
//
// Owner-only. Anonymous viewers get redirected to /auth/sign-in?next=…;
// authenticated non-owners get redirected to /plan/[slug]. Owners reach
// the page even when the plan is archived (T-06-06 owner-bypass — see
// getPlanBySlug `allowArchived` opt-in).
//
// Sections (UI-SPEC §Surface 6):
//   1. Detalles del plan — PlanDetailsForm (client)
//   2. Links de invitación — InviteTokensSection (client) + TokenRow list
//   3. Estado del plan — PlanStatusSection (client) + ArchiveDialog
//
// Header chrome is mounted per-page (Plan 01-04 pattern): we don't have a
// plan-aware PlanHeader here because the settings page intentionally uses a
// simpler back-chevron header (UI-SPEC §Surface 6).

import { InviteTokensSection } from '@/components/plan/settings/InviteTokensSection';
import { PlanDetailsForm } from '@/components/plan/settings/PlanDetailsForm';
import { PlanStatusSection } from '@/components/plan/settings/PlanStatusSection';
import type { TokenRowToken } from '@/components/plan/settings/TokenRow';
import { getRequiredUser } from '@/lib/auth/require-user';
import { getPlanBySlug } from '@/lib/db/queries/plans';
import { createServerClient } from '@/lib/supabase/server';
import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
};

export default async function PlanSettingsPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const cookieStore = await cookies();
  // AUTH-06: anonymous viewers bounce to /auth/sign-in (Plan 01-05 ships it).
  const user = await getRequiredUser(cookieStore, `/plan/${slug}/settings`);
  const supabase = createServerClient(cookieStore);

  // T-06-06: allow archived plans so owners can still reach settings (and
  // potentially un-archive in the future). Non-owners short-circuit below.
  const plan = await getPlanBySlug(supabase, slug, { allowArchived: true });
  if (!plan) notFound();
  if (plan.owner_id !== user.id) {
    // Surface 6 owner gate — authenticated non-owners go to the plan view.
    redirect(`/plan/${slug}`);
  }

  // invite_tokens for the owner-only list. RLS invite_tokens_select_owner
  // additionally enforces ownership; revoked rows are filtered at the query.
  const tokenLookup = await supabase
    .from('invite_tokens')
    .select('id, name, use_count, created_at')
    .eq('plan_id', plan.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });
  const tokens: TokenRowToken[] = (tokenLookup.data ?? []) as TokenRowToken[];

  return (
    <>
      <header className="sticky top-0 z-10 h-14 border-b border-zinc-200 bg-white">
        <div className="flex h-full items-center gap-2 px-4">
          <Link
            href={`/plan/${slug}`}
            aria-label={t('nav.back')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <h1 className="truncate text-xl font-semibold text-zinc-950">
            {t('plan.settings.page_title')}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[480px] space-y-6 px-4 py-6">
        <PlanDetailsForm
          plan={{
            id: plan.id,
            title: plan.title,
            description: plan.description,
            start_date: plan.start_date,
            end_date: plan.end_date,
          }}
        />
        <InviteTokensSection planId={plan.id} tokens={tokens} locale={locale} />
        <PlanStatusSection planId={plan.id} />
      </main>
    </>
  );
}
