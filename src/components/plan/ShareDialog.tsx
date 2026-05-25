'use client';

// Surface 2 — Post-Create Share Dialog.
//
// Renders the /i/[token] invite link in a font-mono block with an icon-only
// Copy button. Primary CTA is the Web Share API ("Compartir vía…"), but it is
// rendered ONLY when navigator.share exists (mobile Safari, Chrome Android).
// The Copy CTA is always visible as a fallback. On copy success the icon
// toggles to a Check for 2 seconds and an sr-only aria-live announcement
// fires (NO toast, per Surface 2 spec).
//
// Focus: shadcn Dialog's default initial-focus target is the first interactive
// child — that's the Copy icon button, which matches the spec.

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, Copy, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteUrl: string;
  planTitle: string;
}

export function ShareDialog({ open, onOpenChange, inviteUrl, planTitle }: ShareDialogProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [announce, setAnnounce] = useState('');

  // Detect Web Share API at runtime — must be in an effect because the dialog
  // is client-rendered but the navigator check still needs to happen post-mount
  // to avoid a hydration mismatch with the server-rendered placeholder.
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  // Reset copied state when the dialog closes.
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setAnnounce('');
    }
  }, [open]);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setAnnounce(t('common.copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select + execCommand path is deprecated; surface no error.
    }
  }

  async function handleShare(): Promise<void> {
    try {
      await navigator.share({ title: planTitle, url: inviteUrl });
    } catch {
      // User cancelled or the share sheet errored — silent per spec.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-[512px]">
        <DialogHeader>
          <DialogTitle>{t('plan.share_dialog.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('plan.share_dialog.channel_hint')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex items-stretch gap-2">
          <div className="flex-1 truncate rounded-md bg-zinc-100 p-3 font-mono text-sm text-zinc-700">
            {inviteUrl}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={t('plan.share_dialog.copy_link')}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            {copied ? (
              <Check aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Copy aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>

        <span role="status" aria-live="polite" className="sr-only">
          {announce}
        </span>

        <p className="mt-2 text-sm text-zinc-500">{t('plan.share_dialog.channel_hint')}</p>

        <div className="mt-6 flex flex-col gap-2">
          {canShare ? (
            <Button
              type="button"
              onClick={handleShare}
              className="h-[52px] w-full bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800"
            >
              <Share2 aria-hidden="true" className="h-4 w-4" />
              {t('plan.share_dialog.share_via')}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={canShare ? 'outline' : 'default'}
            onClick={handleCopy}
            className={
              canShare
                ? 'h-[52px] w-full border border-zinc-200 bg-white text-base font-semibold text-zinc-950 hover:bg-zinc-50'
                : 'h-[52px] w-full bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800'
            }
          >
            <Copy aria-hidden="true" className="h-4 w-4" />
            {t('plan.share_dialog.copy_link')}
          </Button>
        </div>

        <DialogFooter className="mt-4 border-t border-zinc-200 pt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-sm text-emerald-700 underline-offset-2 hover:underline"
          >
            {t('plan.share_dialog.go_to_plan')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
