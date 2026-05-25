import { cn } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';

// UI-SPEC §Logo Treatment — prop API locked: <Logo size="sm | md | lg" />.
// Phase 7 will swap the internals for a graphical logo without changing this API.
export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export async function Logo({ size = 'md', className }: LogoProps) {
  const t = await getTranslations('logo');

  if (size === 'sm') {
    return (
      <span
        className={cn(
          'inline-flex h-7 items-center font-semibold text-zinc-950',
          'text-sm leading-none',
          className
        )}
        aria-label={t('wordmark')}
        data-logo-size="sm"
      >
        {t('chip')}
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <span
        className={cn(
          'inline-flex items-center font-semibold text-zinc-950',
          'text-xl leading-tight',
          className
        )}
        aria-label={t('wordmark')}
        data-logo-size="lg"
      >
        {t('wordmark')}
      </span>
    );
  }

  // size === 'md'
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold text-zinc-950',
        'text-base leading-none',
        className
      )}
      aria-label={t('wordmark')}
      data-logo-size="md"
    >
      {t('wordmark')}
    </span>
  );
}
