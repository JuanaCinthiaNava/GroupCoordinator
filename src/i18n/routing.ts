import { defineRouting } from 'next-intl/routing';

// D-20: next-intl scaffold with Spanish as default.
// `localePrefix: 'as-needed'` means /plan/abc routes to the default es locale
// without a /es prefix; /en/plan/abc and /pt/plan/abc are explicit non-default locales.
export const routing = defineRouting({
  locales: ['es', 'en', 'pt'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
