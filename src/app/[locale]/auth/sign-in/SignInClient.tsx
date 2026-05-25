'use client';

// SignInClient — Surface 5 sign-in bottom sheet, open by default on the
// dedicated /auth/sign-in page. Sheet dismissal returns the user to their
// original location (treated as "continuar como visitante").
//
// The sheet's content is shared with the inline plan-page sheet via
// SignInSheetBody — both surfaces render the same Google CTA,
// account_exists recovery banner, privacy line, and guest affordance.

import { SignInSheetBody } from '@/components/auth/SignInSheetBody';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface SignInClientProps {
  initialError?: string;
  nextPath: string;
}

export function SignInClient({ initialError, nextPath }: SignInClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function handleGuest() {
    setOpen(false);
    router.push(nextPath || '/');
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) handleGuest();
      }}
    >
      <SheetContent side="bottom" className="px-6 pb-8 pt-4">
        <SignInSheetBody
          nextPath={nextPath}
          initialError={initialError}
          onGuest={handleGuest}
        />
      </SheetContent>
    </Sheet>
  );
}
