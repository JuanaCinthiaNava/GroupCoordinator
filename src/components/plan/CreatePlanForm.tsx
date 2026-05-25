'use client';

// Surface 1 — Create Plan Form.
//
// react-hook-form + Zod resolver. Title required, dates + description optional
// behind a collapsible "Agregar fechas y descripción" trigger. All copy via
// next-intl t() — no hardcoded Spanish (D-20).
//
// Submit calls the createPlan Server Action via a plain FormData object so the
// Server Action sees the same shape it would from a no-JS form submit. On
// error, the action returns { error } and we render a banner at the top of
// the form; on success, the action `redirect()`s and the navigation replaces
// this page (no return value to handle).

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type CreatePlanInput, createPlanSchema } from '@/lib/validation/plan';
import { createPlan } from '@/server/actions/plan';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

export function CreatePlanForm() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const titleId = useId();
  const startId = useId();
  const endId = useId();
  const descId = useId();
  const collapsibleId = useId();
  const errorBannerId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePlanInput>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      title: '',
      startDate: '',
      endDate: '',
      description: '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    const fd = new FormData();
    fd.set('title', values.title);
    if (values.startDate) fd.set('startDate', values.startDate);
    if (values.endDate) fd.set('endDate', values.endDate);
    if (values.description) fd.set('description', values.description);

    startTransition(async () => {
      try {
        const result = await createPlan(fd);
        // createPlan either throws NEXT_REDIRECT (which Next bubbles upward to
        // perform navigation) or returns { error }. The redirect path never
        // reaches here; only error returns do.
        if (result && 'error' in result) {
          setServerError(t('plan.create.error_server'));
        }
      } catch (err) {
        // NEXT_REDIRECT is a control-flow signal; re-throw so Next handles it.
        if (err && typeof err === 'object' && 'digest' in err) {
          const digest = (err as { digest?: string }).digest;
          if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
            throw err;
          }
        }
        setServerError(t('plan.create.error_server'));
      }
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      aria-label={t('plan.create.page_title')}
      aria-busy={isPending}
      className="mx-auto mt-4 w-full max-w-[480px] rounded-lg bg-white p-4 shadow-sm md:p-6"
      noValidate
    >
      {serverError ? (
        <div
          role="alert"
          id={errorBannerId}
          className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={titleId}>
          {t('plan.create.field_title_label')}
          <span aria-hidden="true" className="ml-0.5 text-red-600">
            *
          </span>
        </Label>
        <Input
          id={titleId}
          type="text"
          autoFocus
          placeholder={t('plan.create.field_title_placeholder')}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? `${titleId}-error` : undefined}
          aria-required="true"
          {...register('title')}
        />
        {errors.title ? (
          <p
            id={`${titleId}-error`}
            role="alert"
            aria-live="polite"
            className="text-sm font-medium text-red-600"
          >
            {t('plan.create.field_title_required')}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={collapsibleId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-[44px] w-full items-center gap-2 rounded-md text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <ChevronRight
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span>{t('plan.create.collapsible_trigger')}</span>
        </button>

        <div id={collapsibleId} hidden={!open} className="mt-3 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={startId}>{t('plan.create.field_start_date_label')}</Label>
              <Input id={startId} type="date" {...register('startDate')} />
              <p className="text-xs text-zinc-500">{t('plan.create.field_dates_helper')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={endId}>{t('plan.create.field_end_date_label')}</Label>
              <Input id={endId} type="date" {...register('endDate')} />
              <p className="text-xs text-zinc-500">{t('plan.create.field_dates_helper')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={descId}>{t('plan.create.field_description_label')}</Label>
            <Textarea
              id={descId}
              rows={3}
              placeholder={t('plan.create.field_description_placeholder')}
              {...register('description')}
            />
            <p className="text-xs text-zinc-500">{t('plan.create.field_description_helper')}</p>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="mt-6 h-[52px] w-full bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800"
      >
        {t('plan.create.submit')}
      </Button>
    </form>
  );
}
