"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Turns on the public website's colours (app/site-theme.css).
 * On the agency panel, developer panel and admin it renders as "contents": no box, no styles, as if it weren't there.
 */
export default function SiteTheme({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isApp = /^\/(panel|promotor|admin)(\/|$)/.test(pathname);
  return <div className={isApp ? "contents" : "site-theme flex flex-1 flex-col"}>{children}</div>;
}
