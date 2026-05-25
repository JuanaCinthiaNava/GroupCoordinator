'use client';

// Archive + Delete confirmation dialog.
//
// Surface 6 §Estado del plan: BOTH "Archivar plan" and "Eliminar plan" route
// through this dialog. They produce the same archivePlan Server Action call —
// the difference is the copy (delete copy is stronger). Soft-delete only
// (RESEARCH §Open Question 5; D-05).
//
// UI-SPEC §Modal/Sheet Base Rules: focus on Cancel by default. Backdrop is
// bg-zinc-950/60 (already set by the Dialog primitive).

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { archivePlan } from '@/server/actions/plan';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useTransition } from 'react';

export interface ArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  kind: 'archive' | 'delete';
}

export function ArchiveDialog({ open, onOpenChange, planId, kind }: ArchiveDialogProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // Focus on Cancel by default (UI-SPEC §Modal/Sheet Base Rules).
  useEffect(() => {
    if (open) {
      // Defer to next tick so the dialog node is mounted.
      const id = setTimeout(() => cancelRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open]);

  const titleKey =
    kind === 'archive' ? 'plan.settings.archive_dialog_title' : 'plan.settings.delete_dialog_title';
  const copyKey =
    kind === 'archive' ? 'plan.settings.archive_dialog_copy' : 'plan.settings.delete_dialog_copy';
  const confirmKey =
    kind === 'archive' ? 'plan.settings.archive_confirm' : 'plan.settings.delete_confirm';

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('planId', planId);
      try {
        const result = await archivePlan(fd);
        if (result && 'error' in result) {
          // Soft-fail: close the dialog; the user can retry.
          onOpenChange(false);
        }
      } catch (err) {
        // archivePlan throws NEXT_REDIRECT on success — re-throw so Next handles it.
        if (err && typeof err === 'object' && 'digest' in err) {
          const digest = (err as { digest?: string }).digest;
          if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
            throw err;
          }
        }
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>{t(copyKey)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="h-11 text-base font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
            aria-busy={isPending}
            className="h-11 bg-red-600 text-base font-semibold text-white hover:bg-red-700"
          >
            {t(confirmKey)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
