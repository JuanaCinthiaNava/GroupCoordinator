'use client';

// ShareDialogTrigger — owns the open/closed state for the post-create share
// dialog. Mounted by /plan/[slug] when:
//   1) The current user is the plan owner AND
//   2) The page URL carries ?share=1 (set by createPlan redirect, D-07)
//
// Also exposes a "Compartir" button for re-opening the dialog later (rendered
// in the plan header chrome via PlanHeader).

import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ShareDialog } from './ShareDialog';

export interface ShareDialogTriggerProps {
  planTitle: string;
  inviteToken: string;
  openOnMount?: boolean;
  /** Optional pre-resolved share URL (typically `${NEXT_PUBLIC_SITE_URL}/i/[token]`).
   *  When omitted, falls back to window.location.origin (set after mount). */
  inviteUrl?: string;
  /** When true, hide the "Compartir" affordance and only auto-open. Used on
   *  pages that already have a Compartir button elsewhere. */
  hideTrigger?: boolean;
}

export function ShareDialogTrigger({
  planTitle,
  inviteToken,
  openOnMount,
  inviteUrl: inviteUrlProp,
  hideTrigger,
}: ShareDialogTriggerProps) {
  const t = useTranslations();
  const [open, setOpen] = useState<boolean>(false);
  const [resolvedUrl, setResolvedUrl] = useState<string>(inviteUrlProp ?? '');

  useEffect(() => {
    if (inviteUrlProp) {
      setResolvedUrl(inviteUrlProp);
      return;
    }
    if (typeof window !== 'undefined') {
      setResolvedUrl(`${window.location.origin}/i/${inviteToken}`);
    }
  }, [inviteUrlProp, inviteToken]);

  // Auto-open on first render when ?share=1 (D-07).
  // We use an effect so SSR markup is identical to first client render — the
  // dialog content is hidden in the DOM until React attaches it on the client.
  useEffect(() => {
    if (openOnMount) setOpen(true);
  }, [openOnMount]);

  return (
    <>
      {!hideTrigger ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-9 gap-2"
        >
          <Share2 aria-hidden="true" className="h-4 w-4" />
          {t('plan.share_dialog.share_via')}
        </Button>
      ) : null}
      <ShareDialog
        open={open}
        onOpenChange={setOpen}
        inviteUrl={resolvedUrl}
        planTitle={planTitle}
      />
    </>
  );
}
