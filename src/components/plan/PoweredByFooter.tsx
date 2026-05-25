// Surface 3 footer — "Powered by GroupCoordinator" virality tag (MP-5).
// RSC; no client state.

import { getTranslations } from 'next-intl/server';

export async function PoweredByFooter() {
  const t = await getTranslations();
  return (
    <footer className="py-4 text-center text-sm text-zinc-400">{t('plan.view.powered_by')}</footer>
  );
}
