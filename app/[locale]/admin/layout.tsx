import type { ReactNode } from "react";
import { connection } from "next/server";
import AdminShell from "@/components/admin/AdminShell";
import { getAdminBadges } from "@/lib/server/admin/dashboard";
import { requireAdmin } from "@/lib/server/admin/current-admin";

/** Admins only: requireAdmin sends any other login to its own panel. Every admin action checks again. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await connection(); // always read fresh data, never prerender at build
  await requireAdmin();
  const badges = await getAdminBadges();
  return <AdminShell badges={badges}>{children}</AdminShell>;
}
