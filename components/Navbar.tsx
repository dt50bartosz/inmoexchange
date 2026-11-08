
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";

import { Container } from "@/components/ui/Layout";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";

/** Pages that open with a full-bleed dark photo: the bar floats over it in white. */
const DARK_HERO = new Set(["/"]);

const LINKS = [
  { href: "/listings", key: "listings" },
  { href: "/#como-funciona", key: "howItWorks" },
  { href: "/blog", key: "blog" },
  { href: "/promotoras", key: "developers" },
  { href: "/registro", key: "join" },
] as const;

export default function Navbar() {
  const locale = useLocale();
  const t = useTranslations("navbar");
  const pathname = usePathname();
  // Phones: the links are in a menu that opens under the bar
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const href = (h: string) => `/${locale}${h}`;
  // Elsewhere the bar is solid and sticky, so it never covers the page title
  const onDark = DARK_HERO.has(pathname);

  return (
    <header
      className={
        onDark
          ? "absolute inset-x-0 top-0 z-40 border-b border-white/15 bg-transparent"
          : "sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md"
      }
    >
      <Container className={`flex items-center justify-between ${onDark ? "py-4" : "py-2"}`}>
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2"
          aria-label={t("home")}
        >
          <Logo onDark={onDark} priority className={onDark ? "h-9" : "h-8"} />
        </Link>

        <nav className="flex items-center gap-8 text-sm font-medium">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={href(l.href)}
              className={`hidden transition-colors md:inline ${
                onDark ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {t(l.key)}
            </Link>
          ))}

          <LanguageSwitcher onDark={onDark} />

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            className="-mr-2 inline-flex size-10 items-center justify-center rounded-lg bg-background/80 text-foreground backdrop-blur outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>
        </nav>
      </Container>

      {open && (
        <div id="mobile-menu" className="border-t border-border bg-background shadow-lg md:hidden">
          <Container className="flex flex-col py-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={href(l.href)}
                onClick={() => setOpen(false)}
                className="border-b border-border py-3 text-sm font-medium last:border-0 hover:text-primary"
              >
                {t(l.key)}
              </Link>
            ))}
          </Container>
        </div>
      )}
    </header>
  );
}
