'use client';

// Surface 6 §Detalles del plan — edit title/dates/description.
//
// Mirrors CreatePlanForm (Plan 01-04) but pre-populates from props.plan and
// submits to the updatePlan Server Action. Inline success indicator on save
// (no toast). All copy via t() — D-20.

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type UpdatePlanInput, updatePlanSchema } from '@/lib/validation/plan';
import { updatePlan } from '@/server/actions/plan';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

export interface PlanDetailsFormPlan {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface PlanDetailsFormProps {
  plan: PlanDetailsFormPlan;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  // Postgres timestamptz comes back as ISO; <input type="date"> needs YYYY-MM-DD.
  return iso.slice(0, 10);
}

export function PlanDetailsForm({ plan }: PlanDetailsFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const titleId = useId();
  const startId = useId();
  const endId = useId();
  const descId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePlanInput>({
    resolver: zodResolver(updatePlanSchema),
    defaultValues: {
      planId: plan.id,
      title: plan.title,
      startDate: toDateInputValue(plan.start_date),
      endDate: toDateInputValue(plan.end_date),
      description: plan.description ?? '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    const fd = new FormData();
    fd.set('planId', values.planId);
    fd.set('title', values.title);
    if (values.startDate) fd.set('startDate', values.startDate);
    if (values.endDate) fd.set('endDate', values.endDate);
    if (values.description) fd.set('description', values.description);

    startTransition(async () => {
      try {
        const result = await updatePlan(fd);
        if (result && 'error' in result) {
          setServerError(t('common.error_generic'));
        } else {
          setSavedAt(Date.now());
          // Clear the success indicator after 2 seconds.
          setTimeout(() => setSavedAt(null), 2000);
        }
      } catch (err) {
        if (err && typeof err === 'object' && 'digest' in err) {
          const digest = (err as { digest?: string }).digest;
          if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
            throw err;
          }
        }
        setServerError(t('common.error_generic'));
      }
    });
  });

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-zinc-950">{t('plan.settings.section_details')}</h2>
      <form
        onSubmit={onSubmit}
        aria-busy={isPending}
        className="rounded-lg bg-white p-4 shadow-sm md:p-6"
        noValidate
      >
        {serverError ? (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {serverError}
          </div>
        ) : null}

        <input type="hidden" {...register('planId')} />

        <div className="space-y-2">
          <Label htmlFor={titleId}>{t('plan.create.field_title_label')}</Label>
          <Input
            id={titleId}
            type="text"
            aria-invalid={!!errors.title}
            aria-required="true"
            {...register('title')}
          />
          {errors.title ? (
            <p role="alert" aria-live="polite" className="text-sm font-medium text-red-600">
              {t('plan.create.field_title_required')}
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={startId}>{t('plan.create.field_start_date_label')}</Label>
            <Input id={startId} type="date" {...register('startDate')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={endId}>{t('plan.create.field_end_date_label')}</Label>
            <Input id={endId} type="date" {...register('endDate')} />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor={descId}>{t('plan.create.field_description_label')}</Label>
          <Textarea id={descId} rows={3} {...register('description')} />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
            aria-busy={isPending}
            className="h-11 bg-emerald-700 px-6 text-base font-semibold text-white hover:bg-emerald-800"
          >
            {t('common.save')}
          </Button>
          {savedAt ? (
            <span
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700"
            >
              <Check aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">{t('common.save')}</span>
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
