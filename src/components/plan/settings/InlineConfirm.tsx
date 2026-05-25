'use client';

// Generic Gmail-style inline confirm for destructive actions in lists.
//
// UI-SPEC §Modal/Sheet Base Rules: token revoke is NOT a modal — it expands
// inline within the row. role="alert" announces the expansion to screen
// readers. Focus moves to the Cancel button by default (safe-default rule).

import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';

export interface InlineConfirmProps {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  busy?: boolean;
}

export function InlineConfirm({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = true,
  busy = false,
}: InlineConfirmProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // Focus the safe-default (Cancel) on mount.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div role="alert" aria-live="polite" className="mt-3 rounded-md bg-zinc-50 p-3">
      <p className="text-sm text-zinc-700">{message}</p>
      <div className="mt-3 flex flex-col gap-2">
        <Button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy}
          className={
            destructive
              ? 'h-11 w-full bg-red-600 text-base font-semibold text-white hover:bg-red-700'
              : 'h-11 w-full bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800'
          }
        >
          {confirmLabel}
        </Button>
        <Button
          ref={cancelRef}
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={busy}
          className="h-11 w-full text-base font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
