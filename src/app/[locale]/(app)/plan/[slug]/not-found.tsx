// Plan view not-found — rendered when getPlanBySlug returns null (RLS blocked
// or no row exists). The two cases are deliberately indistinguishable per
// defense-in-depth.

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const metadata: Metadata = { robots: 'noindex, nofollow' };

export default async function PlanNotFound() {
  const t = await getTranslations();
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-[480px] rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-950">{t('errors.plan_not_found')}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t('errors.plan_not_found_sub')}</p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            {t('nav.back')}
          </Link>
        </div>
      </div>
    </div>
  );
}
