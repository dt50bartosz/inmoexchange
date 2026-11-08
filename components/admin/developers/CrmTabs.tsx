"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/admin";

const TABS = [
  { href: ADMIN_ROUTES.developers, label: "Developers" },
  { href: ADMIN_ROUTES.projects, label: "All projects" },
];

/** Developers | All projects, under the CRM page title. */
export default function CrmTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Developer CRM" className="mb-6 flex gap-1 border-b">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
