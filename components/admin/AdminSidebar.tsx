"use client";

import { Building, Building2, HardHat, Home, Newspaper, Inbox, KeyRound, LayoutDashboard, LogOut, Plus, Rss, ShieldCheck, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import type { AdminBadges } from "@/lib/server/admin/dashboard";
import { adminLogout } from "@/app/[locale]/admin/server/actions";
import Logo from "@/components/Logo";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: "applications" | "feeds";
  /** Shown indented under the item above it. */
  sub?: boolean;
  /** Overrides the default "this URL or below" check. */
  match?: (pathname: string) => boolean;
};

const P = ADMIN_ROUTES.developers;
const isDevelopmentPage = (path: string) => path.startsWith(ADMIN_ROUTES.projects) || /^\/admin\/promotores\/[^/]+\/promociones(\/|$)/.test(path);

const ITEMS: Item[] = [
  { href: ADMIN_ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: ADMIN_ROUTES.applications, label: "Applications", icon: Inbox, badge: "applications" as const },
  { href: ADMIN_ROUTES.agencies, label: "Agencies", icon: Building2 },
  {
    href: P,
    label: "Developer CRM",
    icon: HardHat,
    match: (path) => (path === P || path.startsWith(`${P}/`)) && !isDevelopmentPage(path) && path !== ADMIN_ROUTES.pickDeveloperForProject,
  },
  { href: ADMIN_ROUTES.projects, label: "Developments", icon: Building, sub: true, match: (path) => isDevelopmentPage(path) && path !== ADMIN_ROUTES.pickDeveloperForProject },
  { href: ADMIN_ROUTES.pickDeveloperForProject, label: "New development", icon: Plus, sub: true, exact: true },
  { href: ADMIN_ROUTES.properties, label: "Properties", icon: Home },
  { href: ADMIN_ROUTES.feeds, label: "XML feeds", icon: Rss, badge: "feeds" as const },
  { href: ADMIN_ROUTES.blog, label: "Blog", icon: Newspaper },
  { href: ADMIN_ROUTES.security, label: "Security", icon: KeyRound },
];

/** `counts` are loaded on the server by the admin layout. */
export default function AdminSidebar({ counts }: { counts: AdminBadges }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="flex flex-col gap-1 p-3">
      <div className="mb-3 flex items-center gap-2 px-2 py-1.5">
        <Logo className="h-7" />
        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
          <ShieldCheck aria-hidden className="size-3.5" />
          Admin
        </span>
      </div>
      {ITEMS.map(({ href, label, icon: Icon, exact, badge, sub, match }) => {
        const active = match ? match(pathname) : exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        const count = badge ? counts[badge] : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg py-2 text-sm outline-none ${sub ? "pl-9 pr-2.5" : "px-2.5"} transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
              active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Icon aria-hidden className="size-4" />
            <span className="flex-1">{label}</span>
            {count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
                  badge === "feeds" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                }`}
              >
                {count}
                <span className="sr-only">{badge === "feeds" ? " feeds with errors" : " pending"}</span>
              </span>
            )}
          </Link>
        );
      })}
      <form action={adminLogout} className="mt-4 border-t pt-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut aria-hidden className="size-4" />
          Log out
        </button>
      </form>
    </nav>
  );
}
