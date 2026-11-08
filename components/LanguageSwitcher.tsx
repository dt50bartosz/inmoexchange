"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, { short: string; name: string }> = {
  es: { short: "ES", name: "Español" },
  en: { short: "EN", name: "English" },
  pl: { short: "PL", name: "Polski" },
};

/** ES / EN / PL. Keeps the current page and its search filters. onDark: over a hero photo. */
export default function LanguageSwitcher({ className = "", onDark = false }: { className?: string; onDark?: boolean }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (next: Locale) =>
    startTransition(() => {
      // Same page and filters, other language (no custom pathnames: the path is the real one)
      const query = typeof window !== "undefined" ? window.location.search : "";
      router.replace(pathname + query, { locale: next, scroll: false });
    });

  return (
    <div role="group" aria-label="Language / Idioma" className={`flex items-center gap-0.5 text-xs ${className}`}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          title={LABELS[l].name}
          aria-label={LABELS[l].name}
          aria-pressed={l === locale}
          disabled={pending}
          onClick={() => l !== locale && choose(l)}
          className={`rounded px-1.5 py-1 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            l === locale
              ? onDark ? "bg-white/15 text-white" : "bg-secondary text-secondary-foreground"
              : onDark ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {LABELS[l].short}
        </button>
      ))}
    </div>
  );
}
