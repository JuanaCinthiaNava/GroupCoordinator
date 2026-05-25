import { Logo } from '@/components/Logo';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

// Surface 8 — Marketing landing skeleton (UI-SPEC §Surface 8).
// Centered flex column: Logo (lg) + tagline + sub-copy + CTA + footer.
export default async function MarketingLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');

  return (
    <main
      aria-label="GroupCoordinator"
      className="relative flex min-h-screen flex-col items-center bg-zinc-50 px-4"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6 pt-16 pb-24 text-center">
        <Logo size="lg" />
        <h1 className="mt-6 max-w-xs text-2xl font-semibold leading-tight text-zinc-950">
          {t('tagline')}
        </h1>
        <p className="mt-3 max-w-sm text-base text-zinc-500">{t('sub_tagline')}</p>
        <Link
          href="/plan/new"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-8 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          {t('cta_create')}
        </Link>
      </div>
      <footer className="pb-6 text-sm text-zinc-400">{t('footer')}</footer>
    </main>
  );
}
