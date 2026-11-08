import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';
import en from '../messages/en.json';

type Messages = Record<string, unknown>;

/** English underneath, the locale's own texts on top: a text not translated yet shows in English instead of breaking. */
function withEnglishFallback(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const b = base[key];
    out[key] =
      value && typeof value === 'object' && !Array.isArray(value) && b && typeof b === 'object'
        ? withEnglishFallback(b as Messages, value as Messages)
        : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale, locale: explicit }) => {
  // `explicit`: a page asked for a set language (e.g. getMessages({ locale: "en" })); otherwise the URL's
  let locale = explicit ?? (await requestLocale);

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  const own = locale === 'en' ? {} : ((await import(`../messages/${locale}.json`)).default as Messages);
  return {
    locale,
    messages: withEnglishFallback(en as Messages, own),
  };
});
