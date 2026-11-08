"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/** Datos | Unidades, under a development's title. `base` = the development's URL (developer or admin). */
export default function DevelopmentTabs({ base, unitCount }: { base: string; unitCount: number }) {
  const t = useTranslations("units.tabs");
  const pathname = usePathname();
  const tabs = [
    { href: base, label: t("details"), active: pathname === base },
    { href: `${base}/unidades`, label: t("units", { count: unitCount }), active: pathname.startsWith(`${base}/unidades`) },
  ];
  return (
    <nav aria-label={t("label")} className="border-b">
      <ul className="flex gap-1">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={`-mb-px inline-block border-b-2 px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                tab.active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
