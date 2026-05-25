import { getRequestConfig } from 'next-intl/server';
import { type Locale, routing } from './routing';

function hasLocale(locales: readonly Locale[], candidate: string | undefined): candidate is Locale {
  return typeof candidate === 'string' && (locales as readonly string[]).includes(candidate);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const messages = (await import(`@/lib/i18n/messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
