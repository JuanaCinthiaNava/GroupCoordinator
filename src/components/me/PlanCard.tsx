// Surface 7 plan card — RSC. Pure presentation.
//
// Anatomy (UI-SPEC §Surface 7):
//   - <li> wrapping <Link> for full-card tap target
//   - Plan title (2-line clamp, text-xl semibold)
//   - Date range (Intl.DateTimeFormat, locale-aware)
//   - Member count + Updated timestamp + Role badge (owner) + active-link icon
//   - Active treatment: border-l-4 border-emerald-700 when owner + most-recently
//     updated (we mark via a prop computed in the list)
//   - Composed aria-label aggregates title + dates + member count + relative time

import { Badge } from '@/components/ui/badge';
import type { MyPlansRow } from '@/lib/db/queries/my-plans';
import { Link as LinkIcon, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export interface PlanCardProps {
  plan: MyPlansRow;
  locale: string;
  isActive: boolean;
}

function formatDateRange(start: string | null, end: string | null, locale: string): string | null {
  if (!start && !end) return null;
  const fmt = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' });
  if (start && end) {
    return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
  }
  if (start) return fmt.format(new Date(start));
  if (end) return fmt.format(new Date(end));
  return null;
}

function formatRelative(iso: string, locale: string): string {
  // Best-effort relative time via Intl.RelativeTimeFormat. Falls back to a
  // long absolute date when the diff is > 30 days.
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = then - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (Math.abs(diffDays) <= 30) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(diffDays, 'day');
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function PlanCard({ plan, locale, isActive }: PlanCardProps) {
  const t = useTranslations();
  const dateRange = formatDateRange(plan.startDate, plan.endDate, locale);
  const relative = formatRelative(plan.updatedAt, locale);
  const memberLabel = t('me.member_count', { count: plan.memberCount });
  const updatedLabel = t('me.updated_at', { date: relative });
  const ownerLabel = plan.isOwner ? t('me.role_owner') : null;

  // Composed aria-label aggregates the salient fields.
  const ariaLabelParts: string[] = [plan.title];
  if (dateRange) ariaLabelParts.push(dateRange);
  ariaLabelParts.push(memberLabel, updatedLabel);
  if (ownerLabel) ariaLabelParts.push(ownerLabel);
  const ariaLabel = ariaLabelParts.join(', ');

  const cardClasses = [
    'block rounded-lg bg-white p-4 shadow-sm transition-colors transition-shadow duration-150 hover:bg-zinc-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
    isActive ? 'border-l-4 border-emerald-700' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li>
      <Link href={`/plan/${plan.slug}`} aria-label={ariaLabel} className={cardClasses}>
        <h2 className="line-clamp-2 text-xl font-semibold text-zinc-950">{plan.title}</h2>
        {dateRange ? <p className="mt-1 text-sm text-zinc-500">{dateRange}</p> : null}
        <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
          <Users aria-hidden="true" className="inline h-3.5 w-3.5" />
          {memberLabel}
        </p>
        <p className="mt-2 flex items-center justify-between gap-2 text-sm text-zinc-400">
          <span>{updatedLabel}</span>
          <span className="flex items-center gap-2">
            {plan.hasActiveToken ? (
              <LinkIcon aria-hidden="true" className="h-3.5 w-3.5 text-zinc-400" />
            ) : null}
            {ownerLabel ? (
              <Badge className="bg-zinc-100 text-sm text-zinc-600">{ownerLabel}</Badge>
            ) : null}
          </span>
        </p>
      </Link>
    </li>
  );
}
