"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function PanelShell({
  banner,
  footer,
  children,
}: {
  banner?: ReactNode;
  /** The site footer (a server component, so the panel layout passes it in). */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile menu after navigating
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="min-h-dvh bg-surface text-foreground">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {/* A full-height column: the page content grows, so the footer stays at the bottom on short pages */}
      <div className="flex min-h-dvh flex-col lg:pl-64">
        <Topbar onMenu={() => setMenuOpen(true)} />
        {banner}
        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        {footer}
      </div>
    </div>
  );
}
