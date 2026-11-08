import { defineRouting } from 'next-intl/routing';

// Spanish is the default (no prefix: /panel); English and Polish have a prefix (/en/panel, /pl/panel).
// Visitors whose browser prefers English or Polish are sent to their language on their first visit.
export const routing = defineRouting({
  locales: ['es', 'en', 'pl'],
  defaultLocale: 'es',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
