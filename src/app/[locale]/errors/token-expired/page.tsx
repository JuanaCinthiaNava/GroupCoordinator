// Error page — token expired. Reached by 302 from /api/invite/[token] when
// the invite_tokens row has expires_at < now().

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

export const metadata: Metadata = { robots: 'noindex, nofollow' };

export default async function TokenExpiredPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main
      aria-label={t('errors.token_expired')}
      className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4"
    >
      <div className="w-full max-w-[480px] rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-950">{t('errors.token_expired')}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t('errors.plan_not_found_sub')}</p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {t('nav.back')}
          </Link>
        </div>
      </div>
    </main>
  );
}
