// lib/server/admin/dashboard.ts
// Numbers and short lists for the admin dashboard. Plain server functions: only server pages can call them.
import "server-only";
import { collections } from "@/lib/db";
import type { AgencyStatus } from "@/lib/constants/admin";
import type { AdminFeed, AgencyApplication } from "@/types/admin";
import { toApplication } from "./applications";
import { requireAdmin } from "./current-admin";
import { toAdminFeed } from "./feeds";

export type AdminDashboardData = {
  pendingCount: number;
  /** The 5 newest pending applications. */
  pending: AgencyApplication[];
  brokenFeeds: (AdminFeed & { agencyName: string })[];
  feedCount: number;
  hiddenByAdmin: number;
  onNetwork: number;
  propertyCount: number;
  agencies: Record<AgencyStatus, number>;
};

export type AdminBadges = { applications: number; feeds: number };

/** Counts for the sidebar badges: pending applications and feeds with errors. */
export async function getAdminBadges(): Promise<AdminBadges> {
  await requireAdmin();
  const [applications, feeds] = await Promise.all([
    collections.applications.countDocuments({ status: "pending" }),
    collections.feeds.countDocuments({ status: "error" }),
  ]);
  return { applications, feeds };
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  await requireAdmin();
  const p = collections.properties;

  const [pendingCount, pending, broken, feedCount, hiddenByAdmin, onNetwork, propertyCount, agencyDocs] = await Promise.all([
    collections.applications.countDocuments({ status: "pending" }),
    collections.applications.find({ status: "pending" }).sort({ createdAt: -1 }).limit(5).toArray(),
    collections.feeds.find({ status: "error" }).sort({ updatedAt: -1 }).toArray(),
    collections.feeds.countDocuments(),
    p.countDocuments({ moderation: { $ne: null } }),
    // Same rule as the network and XML exports: active, shared, not hidden by the agency or the admin
    p.countDocuments({ status: "active", shared: true, hidden: { $ne: true }, moderation: null }),
    p.countDocuments(),
    collections.agencies.find({}, { projection: { name: 1, status: 1 } }).toArray(),
  ]);

  const agencies: Record<AgencyStatus, number> = { trial: 0, active: 0, suspended: 0, cancelled: 0 };
  for (const a of agencyDocs) agencies[a.status ?? "active"]++;
  const nameById = new Map(agencyDocs.map((a) => [a._id.toHexString(), a.name]));

  return {
    pendingCount,
    pending: pending.map(toApplication),
    brokenFeeds: broken.map((d) => ({ ...toAdminFeed(d), agencyName: nameById.get(d.agencyId) ?? "Deleted agency" })),
    feedCount,
    hiddenByAdmin,
    onNetwork,
    propertyCount,
    agencies,
  };
}
