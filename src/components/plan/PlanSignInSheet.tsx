'use client';

// Surface 5 — Sign-in bottom sheet, opened inline from /plan/[slug] when an
// anonymous guest taps the "Iniciar sesión" CTA on the sign-in affordance bar.
//
// The sheet's content is shared with /auth/sign-in via SignInSheetBody —
// both surfaces render the same Google CTA, account_exists recovery banner,
// privacy line, and guest affordance. This wrapper only owns the open/close
// semantics (Sheet primitive + dismiss → call onOpenChange(false)).

import { SignInSheetBody } from '@/components/auth/SignInSheetBody';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export interface PlanSignInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextPath: string;
  /** Recovery state when the user was bounced back here by /auth/callback. */
  initialError?: string;
}

export function PlanSignInSheet({
  open,
  onOpenChange,
  nextPath,
  initialError,
}: PlanSignInSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-6 pb-8 pt-4">
        <SignInSheetBody
          nextPath={nextPath}
          initialError={initialError}
          onGuest={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
