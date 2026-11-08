"use client";

import { useTranslations } from "next-intl";
import { Building, Building2, Home, UserCheck } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

/** Developer panel sections. Each later feature (developments, registrations) adds its link here. */
const ITEMS = [
  { href: "/promotor", key: "home", icon: Home, exact: true },
  { href: "/promotor/promociones", key: "developments", icon: Building2, exact: false },
  { href: "/promotor/registros", key: "registrations", icon: UserCheck, exact: false },
  { href: "/promotor/perfil", key: "profile", icon: Building, exact: false },
] as const;

export default function PromotorNav() {
  const t = useTranslations("promotor.nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="border-b border-border bg-background">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        {ITEMS.map(({ href, key, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon aria-hidden className="size-4" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
