// Sticky 56px header for /plan/[slug] (and the app shell at large).
//
// RSC. Reads the current Supabase user via the server client passed in by the
// caller (the page-level fetch already paid that cost — pass user explicitly
// instead of re-fetching here).
//
// Phase 1 simplification: <PlanHero> carries the plan title (instead of
// duplicating it inside the header). The reserved 36×36 search slot for
// Phase 6 is present with data-slot="search-reserved" and aria-hidden.
// TODO(Plan 01-04): when post-create share flow lands, render the plan title
// inside the header as well (UI-SPEC §Header anatomy item 2).

import { Logo } from '@/components/Logo';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export interface PlanHeaderProps {
  currentPath: string;
  user: { id: string; isAnonymous: boolean } | null;
}

export async function PlanHeader({ currentPath, user }: PlanHeaderProps) {
  const t = await getTranslations();
  const isAnonymous = !user || user.isAnonymous;
  const isAuthenticated = !!user && !user.isAnonymous;
  const homeHref = isAuthenticated ? '/me' : '/';

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-zinc-200 bg-white">
      <div className="flex h-full items-center gap-3 px-4">
        <Link href={homeHref} aria-label={t('logo.wordmark')} className="inline-flex items-center">
          <Logo size="sm" />
        </Link>

        {/* Spacer pushes the right-side affordances to the edge. */}
        <div className="flex-1" />

        {/* Reserved 36×36 search slot for Phase 6 — see UI-SPEC §Header. */}
        <div aria-hidden="true" data-slot="search-reserved" className="h-9 w-9" />

        {isAnonymous ? (
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(currentPath)}`}
            className="text-sm text-zinc-600 underline-offset-2 hover:underline"
          >
            {t('nav.sign_in')}
          </Link>
        ) : (
          // Authenticated state — Phase 1 placeholder. Full avatar + dropdown
          // (D-14) ships with Plan 01-05 when /auth/callback exists.
          <Link href="/me" className="text-sm text-zinc-600 underline-offset-2 hover:underline">
            {t('nav.my_plans')}
          </Link>
        )}
      </div>
    </header>
  );
}
