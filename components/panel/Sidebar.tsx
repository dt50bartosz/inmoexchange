"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV, type NavItem } from "./nav";
import { useAgency } from "./AgencyProvider";

function matches(pathname: string, item: NavItem): boolean {
  if (item.href.includes("?")) return false; // shortcuts that open a dialog or tab are never "the current page"
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/** Only the most specific match is highlighted: on /mis-propiedades/new that is "Add property", not "My properties". */
function activeHref(pathname: string): string | null {
  const hits = NAV.flatMap((g) => g.items).filter((i) => matches(pathname, i));
  return hits.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const agency = useAgency();
  const t = useTranslations("Sidebar");
  const current = activeHref(pathname);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={t("ariaLabel")}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform motion-reduce:transition-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-4">
          <Link href="/panel" onClick={onClose} className="flex min-w-0 items-center gap-3">
            {agency.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agency.logo}
                alt=""
                className="h-8 w-8 shrink-0 rounded object-contain"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary text-sm font-semibold text-white"
              >
                {agency.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            <span className="truncate font-semibold">{agency.name}</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent lg:hidden"
            aria-label={t("close")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.titleKey} className="mb-6">
              <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">
                {t(group.titleKey)}
              </p>

              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = item.href === current;
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-md py-2 text-sm ${item.sub ? "pl-9 pr-3" : "px-3"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-foreground hover:bg-accent"
                        }`}
                      >
                        <Icon size={item.sub ? 16 : 18} aria-hidden="true" />
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}