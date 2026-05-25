// Sticky 56px header for /plan/[slug] (and the app shell at large).
//
// RSC shell — renders Logo + (optional) plan title + (optional) member stack
// + (optional) owner gear + auth affordance. The auth affordance is either
// the "Iniciar sesión" link (anonymous) or the HeaderUserMenu client island
// (authenticated). D-14: authenticated header replaces the sign-in link with
// avatar + dropdown.
//
// Plan title slot — completed in Plan 01-04 per the Plan 01-03 TODO. When the
// `plan` prop is provided, the title appears beside the Logo (truncated 160px
// @ 375px / 240px @ md / 400px @ lg).

import { Logo } from '@/components/Logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Settings } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { HeaderUserMenu } from './HeaderUserMenu';

interface PlanForHeader {
  slug: string;
  title: string;
  owner_id: string;
}

interface MemberForHeader {
  user_id: string;
  display_name: string;
}

export interface PlanHeaderProps {
  currentPath: string;
  user: { id: string; isAnonymous: boolean; displayName?: string } | null;
  plan?: PlanForHeader | null;
  members?: ReadonlyArray<MemberForHeader>;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

const HEADER_AVATAR_VISIBLE_MOBILE = 3;
const HEADER_AVATAR_VISIBLE_MD = 5;

export async function PlanHeader({ currentPath, user, plan, members }: PlanHeaderProps) {
  const t = await getTranslations();
  const isAnonymous = !user || user.isAnonymous;
  const isAuthenticated = !!user && !user.isAnonymous;
  const isOwner = isAuthenticated && !!plan && user.id === plan.owner_id;
  const homeHref = isAuthenticated ? '/me' : '/';

  // Member stack — show top N depending on viewport via responsive classes.
  // We render up to MD-cap then trust CSS to hide the overflow on smaller
  // viewports. Phase 1 keeps this simple — exact responsive thresholds are a
  // polish task.
  const memberSlice = (members ?? []).slice(0, HEADER_AVATAR_VISIBLE_MD);
  const overflow = (members?.length ?? 0) - memberSlice.length;

  const userDisplayName = user?.displayName ?? '';
  const userInitials = initials(userDisplayName || 'U');
  const planSettingsHref = plan ? `/plan/${plan.slug}/settings` : undefined;

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-zinc-200 bg-white">
      <div className="flex h-full items-center gap-3 px-4">
        <Link href={homeHref} aria-label={t('logo.wordmark')} className="inline-flex items-center">
          <Logo size="sm" />
        </Link>

        {plan ? (
          <h2 className="max-w-[160px] truncate text-xl font-semibold text-zinc-950 md:max-w-[240px] lg:max-w-[400px]">
            {plan.title}
          </h2>
        ) : null}

        {/* Spacer pushes the right-side affordances to the edge. */}
        <div className="flex-1" />

        {/* Reserved 36×36 search slot for Phase 6 — see UI-SPEC §Header. */}
        <div aria-hidden="true" data-slot="search-reserved" className="h-9 w-9" />

        {memberSlice.length > 0 ? (
          <ul
            className="hidden items-center md:flex"
            aria-label={t('plan.view.members_section', { count: members?.length ?? 0 })}
          >
            {memberSlice.map((m, idx) => (
              <li
                key={m.user_id}
                className="-ml-2 first:ml-0"
                style={{ zIndex: memberSlice.length - idx }}
              >
                <Avatar className="h-7 w-7 border-2 border-white">
                  <AvatarFallback className="text-[10px]">
                    {initials(m.display_name)}
                  </AvatarFallback>
                </Avatar>
              </li>
            ))}
            {overflow > 0 ? (
              <li className="-ml-2 inline-flex h-7 items-center rounded-full border-2 border-white bg-zinc-100 px-2 text-[11px] font-semibold text-zinc-700">
                +{overflow}
              </li>
            ) : null}
          </ul>
        ) : null}

        {isOwner && planSettingsHref ? (
          <Link
            href={planSettingsHref}
            aria-label={t('nav.plan_settings')}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100"
          >
            <Settings aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : null}

        {isAnonymous ? (
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(currentPath)}`}
            className="text-sm text-zinc-600 underline-offset-2 hover:underline"
          >
            {t('nav.sign_in')}
          </Link>
        ) : (
          <HeaderUserMenu
            initials={userInitials}
            isOwner={isOwner}
            planSettingsHref={planSettingsHref}
          />
        )}
      </div>
    </header>
  );
}
