// Empty-plan empty state — D-08 verbatim copy with creator interpolation.
//
// CP-1 + CP-4 mitigation: NO disabled feature placeholders, NO grayed-out tabs.
// Just a centered context-aware line referring to the named creator.
//
// The interpolation key is intentionally `Creator` (uppercase C) per the
// CONTEXT.md / es.json contract. Future plans that pass {creator} (lowercase)
// will see the literal `{creator}` rendered — the unit test in 01-01 asserts
// this verbatim.

import { getTranslations } from 'next-intl/server';

export interface EmptyPlanStateProps {
  creatorName: string;
}

export async function EmptyPlanState({ creatorName }: EmptyPlanStateProps) {
  const t = await getTranslations();
  return (
    <section
      aria-label={t('plan.view.empty_heading', { Creator: creatorName })}
      className="px-4 py-12 text-center"
    >
      <p className="text-base text-zinc-500">
        {t('plan.view.empty_heading', { Creator: creatorName })}
      </p>
      <p className="mt-2 text-sm text-zinc-400">{t('plan.view.empty_sub')}</p>
    </section>
  );
}
