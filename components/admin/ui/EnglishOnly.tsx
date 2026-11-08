import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/**
 * The admin area is in English. Components shared with the panel (e.g. the project form) use the panel's
 * translations, so admin pages that show them wrap them in this: English texts whatever the URL's locale.
 */
export default function EnglishOnly({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  );
}
