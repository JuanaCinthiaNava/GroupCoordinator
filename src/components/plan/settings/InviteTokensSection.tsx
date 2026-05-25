'use client';

// Surface 6 §Links de invitación — list + Generate-new CTA.
//
// Token name defaults: when token.name is null, render `Link {N}` where N is
// the 1-based reverse-chronological position (the most-recent token is
// "Link 1"). The list is server-sourced and only revoked_at IS NULL rows are
// passed in.

import { TokenRow, type TokenRowToken } from '@/components/plan/settings/TokenRow';
import { Button } from '@/components/ui/button';
import { mintInviteToken } from '@/server/actions/invite-token';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export interface InviteTokensSectionProps {
  planId: string;
  tokens: TokenRowToken[];
  locale: string;
}

export function InviteTokensSection({ planId, tokens, locale }: InviteTokensSectionProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await mintInviteToken(planId, 'viewer');
      if (result && 'error' in result) {
        // Soft-fail; the page will not auto-refresh in this branch.
        return;
      }
      // Server Action revalidate already invalidated the page cache; force a
      // client-side refresh so the new row renders immediately.
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-zinc-950">{t('plan.settings.section_invites')}</h2>
      <p className="text-sm text-zinc-500">
        {t('plan.settings.invites_active', { count: tokens.length })}
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={handleGenerate}
        disabled={isPending}
        aria-busy={isPending}
        className="h-11 w-full border border-zinc-200 bg-white text-base font-semibold text-zinc-950 hover:bg-zinc-50"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        {t('plan.settings.generate_link')}
      </Button>

      {tokens.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {tokens.map((token, idx) => {
            // 1-based reverse-chronological index: most-recent token = "Link 1".
            const position = idx + 1;
            const defaultName = t('plan.settings.token_default_name', { number: position });
            return (
              <TokenRow key={token.id} token={token} defaultName={defaultName} locale={locale} />
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
