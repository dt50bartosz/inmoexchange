"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/** Section anchors on this page (plain <a>, no navigation) and two other public pages. */
const LINKS = [
  { href: "#como-funciona", key: "howItWorks", anchor: true },
  { href: "#reglas", key: "rules", anchor: true },
  { href: "#faq", key: "faq", anchor: true },
  { href: "/blog", key: "blog", anchor: false },
  { href: "/promotoras", key: "developers", anchor: false },
] as const;

/** The landing header's navigation, on navy: links on desktop, a menu under the bar on phones. */
export default function LandingNav() {
  const t = useTranslations("landing.nav");
  const [open, setOpen] = useState(false);

  // Close the phone menu with Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const item = (l: (typeof LINKS)[number], className: string) =>
    l.anchor ? (
      <a key={l.href} href={l.href} onClick={() => setOpen(false)} className={className}>
        {t(l.key)}
      </a>
    ) : (
      <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={className}>
        {t(l.key)}
      </Link>
    );

  return (
    <>
      <nav aria-label={t("label")} className="hidden items-center gap-6 text-sm font-medium lg:flex xl:gap-8">
        {LINKS.map((l) => item(l, "whitespace-nowrap text-white/80 transition-colors hover:text-white"))}
      </nav>

      <div className="flex items-center gap-3 sm:gap-5">
        <LanguageSwitcher onDark />
        <Link href="/login" className="text-sm font-medium text-white/85 underline-offset-4 hover:text-white hover:underline">
          {t("login")}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="landing-menu"
          aria-label={open ? t("closeMenu") : t("openMenu")}
          className="-mr-2 inline-flex size-10 items-center justify-center rounded-lg text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white lg:hidden"
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </div>

      {open && (
        <nav
          id="landing-menu"
          aria-label={t("label")}
          className="absolute inset-x-0 top-full z-40 border-y border-white/15 bg-navy px-5 shadow-lg sm:px-8 lg:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col py-2">
            {LINKS.map((l) =>
              item(l, "border-b border-white/10 py-3 text-sm font-medium text-white/85 last:border-0 hover:text-white"),
            )}
          </div>
        </nav>
      )}
    </>
  );
}
