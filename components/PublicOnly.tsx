"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * The public site's header and footer: not on the agency panel, developer panel or admin, which have their own (the panel shows
 * the footer inside its shell), nor on the home page and /promotoras (those landings have their own header and footer).
 */
export default function PublicOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ownChrome = pathname === "/" || pathname === "/promotoras" || /^\/(panel|promotor|admin)(\/|$)/.test(pathname);
  return ownChrome ? null : <>{children}</>;
}
