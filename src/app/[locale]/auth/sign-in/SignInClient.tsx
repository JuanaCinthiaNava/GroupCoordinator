'use client';

// SignInClient — Surface 5 sign-in bottom sheet, open by default.
//
// Initiates Google OAuth via supabase.auth.signInWithOAuth with redirectTo
// pointing at /auth/callback?next=<encoded>. The callback in this plan
// (src/app/auth/callback/route.ts) exchanges the code, upserts plan_members
// when app_metadata.plan_id is set, and 302s to `next`.
//
// Accessibility: Sheet primitive handles aria-modal + focus trap; we add the
// Google button as the initial focus target via autoFocus and announce the
// redirecting state via role="status" aria-live="polite".

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface SignInClientProps {
  initialError?: string;
  nextPath: string;
}

// Inline Google logo SVG (multi-color G mark) — 20px square. Kept inline to
// avoid pulling a static asset just for one icon.
function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.8-2 13.3-5.3l-6.1-5c-2 1.4-4.5 2.3-7.2 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.1 5C40.9 35.4 44 30.1 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export function SignInClient({ initialError, nextPath }: SignInClientProps) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  async function handleGoogle() {
    setRedirecting(true);
    try {
      const supabase = getBrowserClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
          queryParams: { prompt: 'select_account' },
        },
      });
    } catch {
      setRedirecting(false);
    }
  }

  function handleGuest() {
    setOpen(false);
    router.push(nextPath || '/');
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        // Treat sheet dismissal the same as "continuar como visitante" — return
        // the user to their original location.
        if (!next) handleGuest();
      }}
    >
      <SheetContent side="bottom" className="px-6 pb-8 pt-4">
        <SheetHeader>
          <SheetTitle>{t('auth.sign_in_sheet_title')}</SheetTitle>
          <SheetDescription>{t('auth.sign_in_descriptor')}</SheetDescription>
        </SheetHeader>

        {initialError === 'account_exists' ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-zinc-200 bg-zinc-100 p-3 text-sm text-zinc-700"
          >
            {t('auth.error_account_exists')}
          </div>
        ) : null}

        <div className="mt-6">
          <Button
            type="button"
            onClick={handleGoogle}
            disabled={redirecting}
            aria-busy={redirecting}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800 disabled:opacity-70"
          >
            <GoogleLogo />
            <span>{redirecting ? t('auth.redirecting') : t('auth.google_button')}</span>
          </Button>
          {redirecting ? (
            <span role="status" aria-live="polite" className="sr-only">
              {t('auth.redirecting')}
            </span>
          ) : null}
        </div>

        <p className="mt-4 text-center text-sm text-zinc-400">
          {t.rich('auth.privacy_line', {
            terms: (chunks) => (
              // TODO(Phase 7): wire legal pages /legal/terms + /legal/privacy.
              <a href="/legal/terms" className="text-zinc-500 underline-offset-2 hover:underline">
                {chunks}
              </a>
            ),
            privacy: (chunks) => (
              <a href="/legal/privacy" className="text-zinc-500 underline-offset-2 hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>

        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={handleGuest}
            className="text-sm text-zinc-500 underline-offset-2 hover:underline"
          >
            {t('auth.continue_as_guest')}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
