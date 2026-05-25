'use client';

// Surface 6 §Estado del plan — Archive + Delete buttons.
//
// Both buttons open the ArchiveDialog with different `kind` values; the
// dialog calls the same archivePlan Server Action either way (soft-delete
// only per RESEARCH §Open Question 5).

import { ArchiveDialog } from '@/components/plan/settings/ArchiveDialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export interface PlanStatusSectionProps {
  planId: string;
}

export function PlanStatusSection({ planId }: PlanStatusSectionProps) {
  const t = useTranslations();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-zinc-950">{t('plan.settings.section_status')}</h2>
      <Button
        type="button"
        variant="outline"
        onClick={() => setArchiveOpen(true)}
        className="h-11 w-full border-red-200 text-base font-semibold text-red-600 hover:bg-red-50"
      >
        {t('plan.settings.archive_button')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setDeleteOpen(true)}
        className="h-11 w-full text-sm font-semibold text-zinc-500 hover:bg-zinc-100"
      >
        {t('plan.settings.delete_button')}
      </Button>

      <ArchiveDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        planId={planId}
        kind="archive"
      />
      <ArchiveDialog open={deleteOpen} onOpenChange={setDeleteOpen} planId={planId} kind="delete" />
    </section>
  );
}
