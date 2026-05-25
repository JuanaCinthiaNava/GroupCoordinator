'use client';

// Surface 5 — Sign-in bottom sheet. Initiates Supabase Google OAuth via
// signInWithOAuth from the browser client. /auth/callback completes the
// upgrade (exchangeCodeForSession + plan_members upsert + redirect to next).

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

export interface PlanSignInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextPath: string;
}

export function PlanSignInSheet({ open, onOpenChange, nextPath }: PlanSignInSheetProps) {
  const t = useTranslations();

  async function handleGoogle() {
    const supabase = getBrowserClient();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        queryParams: { prompt: 'select_account' },
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-6 pb-8 pt-4">
        <SheetHeader>
          <SheetTitle>{t('auth.sign_in_sheet_title')}</SheetTitle>
          <SheetDescription>{t('auth.sign_in_descriptor')}</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <Button
            type="button"
            onClick={handleGoogle}
            className="h-[52px] w-full bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800"
          >
            {t('auth.google_button')}
          </Button>
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
            onClick={() => onOpenChange(false)}
            className="text-sm text-zinc-500 underline-offset-2 hover:underline"
          >
            {t('auth.continue_as_guest')}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
