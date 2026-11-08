// app/[locale]/promotor/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PromotorNav from "@/components/developer/PromotorNav";
import { requireRole } from "@/lib/server/auth/require-role";
import { logout } from "./server/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("promotor");
  return { title: { template: `%s | ${t("panelName")}`, default: t("panelName") }, robots: { index: false, follow: false } };
}

/** Developer panel: role "developer" only. Agency and admin logins are sent to their own panel by requireRole. */
export default async function PromotorLayout({ children }: { children: ReactNode }) {
  const { account, email } = await requireRole("developer");
  const t = await getTranslations("promotor");

  return (
    <div className="min-h-dvh bg-surface text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/promotor" className="min-w-0 truncate font-semibold">
            {account.name}
            <span className="ml-2 hidden text-sm font-normal text-muted-foreground sm:inline">{t("panelName")}</span>
          </Link>
          <div className="flex-1" />
          <LanguageSwitcher />
          <span className="hidden truncate text-sm text-muted-foreground md:block">{email}</span>
          <form action={logout}>
            <button type="submit" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent">
              <LogOut aria-hidden className="size-4" />
              {t("logout")}
            </button>
          </form>
        </div>
      </header>
      <PromotorNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
