// /plan/new — RSC. AUTH-06 enforced via getRequiredUser. Renders the
// CreatePlanForm client island (Surface 1). noindex per D-22.

import { CreatePlanForm } from '@/components/plan/CreatePlanForm';
import { PlanHeader } from '@/components/plan/PlanHeader';
import { getRequiredUser } from '@/lib/auth/require-user';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return {
    title: t('plan.create.page_title'),
    robots: 'noindex, nofollow',
  };
}

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // AUTH-06: require non-anonymous user. Redirects to /auth/sign-in?next=…
  // when missing. /auth/sign-in does not exist until Plan 01-05 — visiting it
  // before then 404s, which is the documented gate.
  const cookieStore = await cookies();
  const user = await getRequiredUser(cookieStore, '/plan/new');

  const userForHeader = {
    id: user.id,
    isAnonymous: user.is_anonymous === true,
    displayName:
      ((user.user_metadata ?? {}) as { full_name?: string; name?: string }).full_name ??
      ((user.user_metadata ?? {}) as { full_name?: string; name?: string }).name ??
      user.email?.split('@')[0] ??
      '',
  };

  return (
    <>
      <PlanHeader currentPath="/plan/new" user={userForHeader} />
      <main id="main-content" className="flex-1 px-4 pb-32">
        <h1 className="px-1 pt-6 text-2xl font-semibold text-zinc-950">
          {t('plan.create.page_title')}
        </h1>
        <CreatePlanForm />
      </main>
    </>
  );
}
