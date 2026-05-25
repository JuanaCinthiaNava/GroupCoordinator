// /plan/new — RSC. AUTH-06 enforced via getRequiredUser. Renders the
// CreatePlanForm client island (Surface 1). noindex per D-22.

import { CreatePlanForm } from '@/components/plan/CreatePlanForm';
import { getRequiredUser } from '@/lib/auth/require-user';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';

export const metadata: Metadata = { robots: 'noindex, nofollow' };

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
  await getRequiredUser(cookieStore, '/plan/new');

  return (
    <section className="px-4">
      <h1 className="px-1 pt-6 text-2xl font-semibold text-zinc-950">
        {t('plan.create.page_title')}
      </h1>
      <CreatePlanForm />
    </section>
  );
}
