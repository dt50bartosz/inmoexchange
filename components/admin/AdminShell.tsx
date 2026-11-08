"use client";

import type { ReactNode } from "react";
import type { AdminBadges } from "@/lib/server/admin/dashboard";
import AdminSidebar from "./AdminSidebar";

/** Admin layout: sidebar on the left (top on mobile), page on the right. */
export default function AdminShell({ badges, children }: { badges: AdminBadges; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="border-b bg-background lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <AdminSidebar counts={badges} />
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
