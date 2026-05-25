// /me — Surface 7. RSC. PLAN-06.
//
// AUTH-06: getRequiredUser gates; anonymous users redirect to /auth/sign-in.
// Lists every plan the user owns or is a member of, ordered by updated_at DESC.
// Empty state ships per UI-SPEC §Surface 7 (heading + sub + "Crear mi primer plan").
//
// PlanHeader is mounted here so the /me page gets the same sticky 56px chrome
// as /plan/[slug]. The (app) layout no longer mounts the header — each page
// owns its own (Plan 01-04 convention).

import { MyPlansList } from '@/components/me/MyPlansList';
import { PlanHeader } from '@/components/plan/PlanHeader';
import { getRequiredUser } from '@/lib/auth/require-user';
import { getMyPlans } from '@/lib/db/queries/my-plans';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import Link from 'next/link';

export const metadata: Metadata = { robots: 'noindex, nofollow' };

interface UserDisplayMeta {
  full_name?: string;
  name?: string;
  email?: string;
}

async function resolveDisplayName(userId: string): Promise<string> {
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) return '';
    const meta = (data.user.user_metadata ?? {}) as UserDisplayMeta;
    return meta.full_name ?? meta.name ?? data.user.email?.split('@')[0] ?? '';
  } catch {
    return '';
  }
}

export default async function MePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const cookieStore = await cookies();
  const user = await getRequiredUser(cookieStore, '/me');
  const supabase = createServerClient(cookieStore);
  const myPlans = await getMyPlans(supabase, user.id);

  const displayName = await resolveDisplayName(user.id);

  return (
    <>
      <PlanHeader
        currentPath="/me"
        user={{
          id: user.id,
          isAnonymous: user.is_anonymous === true,
          displayName,
        }}
        plan={null}
      />
      <main className="flex flex-1 flex-col">
        <header className="px-4 pt-6">
          <h1 className="text-2xl font-semibold text-zinc-950">{t('me.page_title')}</h1>
        </header>

        {myPlans.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <h2 className="text-xl font-semibold text-zinc-950">{t('me.empty_heading')}</h2>
            <p className="mt-2 text-sm text-zinc-500">{t('me.empty_sub')}</p>
            <Link
              href="/plan/new"
              className="mt-6 inline-flex h-[52px] items-center justify-center rounded-md bg-emerald-700 px-6 text-base font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              {t('me.create_first')}
            </Link>
          </div>
        ) : (
          <>
            <div className="px-4 pt-3 pb-4">
              <Link
                href="/plan/new"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-md bg-emerald-700 px-6 text-base font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 md:w-auto md:max-w-[200px]"
              >
                {t('me.create_cta')}
              </Link>
            </div>
            <MyPlansList plans={myPlans} locale={locale} />
            <div className="h-8" aria-hidden="true" />
          </>
        )}
      </main>
    </>
  );
}
