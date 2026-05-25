'use client';

// Client component — owns the open/closed state for the sign-in bottom sheet.
// Sticky bottom bar visible on the anonymous plan view; hidden on the
// authenticated view via DOM removal (NOT just CSS — CP-1 mitigation).

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PlanSignInSheet } from './PlanSignInSheet';

export interface SignInAffordanceBarProps {
  nextPath: string;
}

export function SignInAffordanceBar({ nextPath }: SignInAffordanceBarProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside
        aria-label={t('plan.view.sign_in_prompt')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white px-4 py-3 shadow-md"
      >
        <p className="mb-2 text-sm text-zinc-600" id="sign-in-prompt">
          {t('plan.view.sign_in_prompt')}
        </p>
        <Button
          type="button"
          onClick={() => setOpen(true)}
          aria-describedby="sign-in-prompt"
          className="h-[52px] w-full bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800"
        >
          {t('plan.view.sign_in_cta')}
        </Button>
      </aside>
      <PlanSignInSheet open={open} onOpenChange={setOpen} nextPath={nextPath} />
    </>
  );
}
