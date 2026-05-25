'use client';

// Shared body for the Surface 5 sign-in bottom sheet — used by both
//   - src/app/[locale]/auth/sign-in/SignInClient.tsx (full /auth/sign-in page)
//   - src/components/plan/PlanSignInSheet.tsx          (inline on /plan/[slug])
//
// The Sheet wrapper stays per-caller (each has its own open/close semantics);
// this component is just the sheet's content. Single source for the Google
// CTA, the account_exists recovery banner, the privacy line, and the
// "continuar como visitante" affordance.

import { Button } from '@/components/ui/button';
import { SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { safeNext } from '@/lib/auth/safe-redirect';
import { getBrowserClient } from '@/lib/supabase/browser';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export interface SignInSheetBodyProps {
  /** Where to land after OAuth completes. Validated by safeNext on submit. */
  nextPath: string;
  /** Surfacing a recovery banner — set to 'account_exists' when the
   * callback bounced the user back here because Google's email collided
   * with an existing account. */
  initialError?: string;
  /** Called when the user picks "continuar como visitante" (or dismisses
   * the sheet, if the wrapper treats that as an opt-out). */
  onGuest?: () => void;
}

// Inline Google logo SVG (multi-color G mark). Kept inline to avoid a static
// asset for one icon.
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

export function SignInSheetBody({ nextPath, initialError, onGuest }: SignInSheetBodyProps) {
  const t = useTranslations();
  const [redirecting, setRedirecting] = useState(false);

  async function handleGoogle() {
    setRedirecting(true);
    try {
      const supabase = getBrowserClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(nextPath, '/'))}`,
          queryParams: { prompt: 'select_account' },
        },
      });
    } catch {
      setRedirecting(false);
    }
  }

  return (
    <>
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

      {onGuest ? (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={onGuest}
            className="text-sm text-zinc-500 underline-offset-2 hover:underline"
          >
            {t('auth.continue_as_guest')}
          </button>
        </div>
      ) : null}
    </>
  );
}
