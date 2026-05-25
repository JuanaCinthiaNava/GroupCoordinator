// Surface 3 hero — plan title (text-display) + optional date range + creator row.
// RSC. Display name resolved at render (D-21) — passed in as a prop from the
// page-level fetch.

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getTranslations } from 'next-intl/server';

export interface PlanHeroProps {
  plan: {
    title: string;
    start_date: string | null;
    end_date: string | null;
  };
  creatorName: string;
  locale: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]?.charAt(0).toUpperCase() ?? '?';
  return ((parts[0]?.charAt(0) ?? '') + (parts[parts.length - 1]?.charAt(0) ?? '')).toUpperCase();
}

function formatDateRange(
  startISO: string | null,
  endISO: string | null,
  locale: string
): string | null {
  if (!startISO) return null;
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : null;
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  });
  const yearFmt = new Intl.DateTimeFormat(locale, { year: 'numeric' });
  if (!end) return `${dateFmt.format(start)} ${yearFmt.format(start)}`;
  // dd MMM – dd MMM yyyy
  const startStr = dateFmt.format(start);
  const endStr = dateFmt.format(end);
  const yearStr = yearFmt.format(end);
  return `${startStr} – ${endStr} ${yearStr}`;
}

export async function PlanHero({ plan, creatorName, locale }: PlanHeroProps) {
  const t = await getTranslations();
  const dateRange = formatDateRange(plan.start_date, plan.end_date, locale);
  return (
    <section className="px-4 pt-6">
      <h1 className="text-2xl font-semibold leading-tight text-zinc-950">{plan.title}</h1>
      {dateRange ? <p className="mt-1 text-sm text-zinc-500">{dateRange}</p> : null}
      <div className="mt-3 flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials(creatorName)}</AvatarFallback>
        </Avatar>
        <p className="text-sm text-zinc-600">{t('plan.view.created_by', { name: creatorName })}</p>
      </div>
      <hr className="mt-6 border-zinc-200" />
    </section>
  );
}
