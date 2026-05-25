'use client';

// Token row — editable name + meta + revoke (Surface 6).
//
// UI-SPEC §Surface 6 token rows:
//  - Row card p-4 rounded-lg shadow-sm
//  - Editable name (tap to edit; Enter or blur confirms; Esc reverts)
//  - Meta line: created date · used N times
//  - Revoke action expands inline confirm (no modal)
//  - 200ms fade-out before unmount
//
// All copy via t() — D-20.

import { InlineConfirm } from '@/components/plan/settings/InlineConfirm';
import { Input } from '@/components/ui/input';
import { renameInviteToken, revokeInviteToken } from '@/server/actions/invite-token';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';

export interface TokenRowToken {
  id: string;
  name: string | null;
  use_count: number;
  created_at: string;
}

export interface TokenRowProps {
  token: TokenRowToken;
  defaultName: string;
  locale: string;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function TokenRow({ token, defaultName, locale }: TokenRowProps) {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [draftName, setDraftName] = useState(token.name ?? defaultName);
  const [committedName, setCommittedName] = useState(token.name ?? defaultName);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isPending, startTransition] = useTransition();

  function commitName() {
    if (draftName.trim() === '' || draftName === committedName) {
      setDraftName(committedName);
      setIsEditing(false);
      return;
    }
    const newName = draftName.trim();
    startTransition(async () => {
      const fd = new FormData();
      fd.set('tokenId', token.id);
      fd.set('name', newName);
      const result = await renameInviteToken(fd);
      if (result && 'error' in result) {
        // Revert visually; the row will refresh on next revalidate anyway.
        setDraftName(committedName);
      } else {
        setCommittedName(newName);
      }
      setIsEditing(false);
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('tokenId', token.id);
      const result = await revokeInviteToken(fd);
      if (result && 'error' in result) {
        // Surface the error inline; close the confirm.
        setIsConfirming(false);
        return;
      }
      // 200ms fade-out before parent revalidate removes us.
      setIsRemoving(true);
    });
  }

  return (
    <li
      className={`rounded-lg bg-white p-4 shadow-sm transition-opacity duration-200 ${
        isRemoving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <Input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitName();
                } else if (e.key === 'Escape') {
                  setDraftName(committedName);
                  setIsEditing(false);
                }
              }}
              autoFocus
              aria-label={t('plan.settings.token_default_name', { number: 0 })}
              className="h-11 text-base font-semibold"
              disabled={isPending}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="min-h-[44px] truncate text-left text-base font-semibold text-zinc-950 hover:underline"
            >
              {committedName}
            </button>
          )}
          <p className="mt-1 text-sm text-zinc-500">
            {t('plan.settings.token_created', { date: formatDate(token.created_at, locale) })} ·{' '}
            {t('plan.settings.token_used', { count: token.use_count })}
          </p>
        </div>
      </div>

      {isConfirming ? (
        <InlineConfirm
          message={t('plan.settings.token_revoke_confirm_copy')}
          confirmLabel={t('plan.settings.token_revoke_confirm_action')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleRevoke}
          onCancel={() => setIsConfirming(false)}
          destructive
          busy={isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          disabled={isPending || isRemoving}
          className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
        >
          {t('plan.settings.token_revoke')}
        </button>
      )}
    </li>
  );
}
