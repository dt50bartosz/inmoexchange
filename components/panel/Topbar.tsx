"use client";

import { LogOut, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAgency } from "./AgencyProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { logout } from "@/app/[locale]/panel/server/actions";

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const agency = useAgency();
  const t = useTranslations("Sidebar");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        className="rounded p-2 text-muted-foreground hover:bg-accent lg:hidden"
        aria-label={t("openMenu")}
      >
        <Menu size={20} aria-hidden="true" />
      </button>

      <div className="flex-1" />

      <LanguageSwitcher />

      {agency.email && (
        <span className="hidden truncate text-sm text-muted-foreground sm:block">{agency.email}</span>
      )}

      <form action={logout}>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
        >
          <LogOut size={16} aria-hidden="true" />
          {t("logout")}
        </button>
      </form>
    </header>
  );
}
