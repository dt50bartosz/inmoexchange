// lib/server/admin/dashboard.ts
// Numbers and short lists for the admin dashboard. Plain server functions: only server pages can call them.
import "server-only";
import { collections } from "@/lib/db";
import type { AgencyStatus } from "@/lib/constants/admin";
import type { AdminFeed, AgencyApplication } from "@/types/admin";
import type { Activity } from "@/types/developers";
import { DEVELOPER_FILTER, listRecentActivity } from "./developers";
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
  /** Estate agencies only (developer accounts are counted under `developers`). */
  agencies: Record<AgencyStatus, number>;
  developers: Record<AgencyStatus, number>;
  developments: { total: number; published: number; draft: number };
  units: { available: number; reserved: number; sold: number };
  registrations: { pending: number; last30: number };
  /** Last 30 days. */
  mls: { views: number; whatsapp: number; contacts: number; newListings: number };
  /** Organisations created in the last 30 days. */
  newAccounts: { agencies: number; developers: number };
  /** Logins used in the last 30 days, by role. */
  activeLogins: { agency: number; developer: number };
  /** Latest development changes by developers and admins. */
  recentActivity: Activity[];
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

  const since = new Date(Date.now() - 30 * 86_400_000);
  const [extra, recentActivity] = await Promise.all([platformNumbers(since), listRecentActivity(8)]);

  const [pendingCount, pending, broken, feedCount, hiddenByAdmin, onNetwork, propertyCount, agencyDocs] = await Promise.all([
    collections.applications.countDocuments({ status: "pending" }),
    collections.applications.find({ status: "pending" }).sort({ createdAt: -1 }).limit(5).toArray(),
    collections.feeds.find({ status: "error" }).sort({ updatedAt: -1 }).toArray(),
    collections.feeds.countDocuments(),
    p.countDocuments({ moderation: { $ne: null } }),
    // Same rule as the network and XML exports: active, shared, not hidden by the agency or the admin
    p.countDocuments({ status: "active", shared: true, hidden: { $ne: true }, moderation: null }),
    p.countDocuments(),
    collections.agencies.find({}, { projection: { name: 1, status: 1, accountType: 1 } }).toArray(),
  ]);

  const agencies: Record<AgencyStatus, number> = { trial: 0, active: 0, suspended: 0, cancelled: 0 };
  const developers: Record<AgencyStatus, number> = { trial: 0, active: 0, suspended: 0, cancelled: 0 };
  for (const a of agencyDocs) (a.accountType === DEVELOPER_FILTER.accountType ? developers : agencies)[a.status ?? "active"]++;
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
    developers,
    ...extra,
    recentActivity,
  };
}

/** Developer, MLS and login numbers across the whole platform. */
async function platformNumbers(since: Date) {
  const [devVisibility, unitStatus, pendingRegs, regs30, events, newListings, newOrgs, logins] = await Promise.all([
    collections.devProjects.aggregate<{ _id: string | null; n: number }>([{ $group: { _id: "$visibility", n: { $sum: 1 } } }]).toArray(),
    collections.devUnits.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
    collections.clientRegistrations.countDocuments({ status: "pending" }),
    collections.clientRegistrations.countDocuments({ createdAt: { $gte: since } }),
    // One event = one visitor on one day (lib/server/property-events.ts)
    collections.propertyEvents.aggregate<{ _id: string; n: number }>([{ $match: { day: { $gte: since.toISOString().slice(0, 10) } } }, { $group: { _id: "$type", n: { $sum: 1 } } }]).toArray(),
    collections.properties.countDocuments({ createdAt: { $gte: since } }),
    collections.agencies.aggregate<{ _id: boolean; n: number }>([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $eq: ["$accountType", "developer"] }, n: { $sum: 1 } } }]).toArray(),
    collections.users.aggregate<{ _id: string | null; n: number }>([{ $match: { lastLoginAt: { $gte: since }, role: { $ne: "admin" } } }, { $group: { _id: "$role", n: { $sum: 1 } } }]).toArray(),
  ]);
  const count = <K,>(rows: { _id: K; n: number }[], key: K) => rows.find((r) => r._id === key)?.n ?? 0;
  // Old developments have no visibility field: they count as published (lib/server/developer/developments.ts)
  const total = devVisibility.reduce((n, r) => n + r.n, 0);
  const draft = count(devVisibility, "draft");
  return {
    developments: { total, published: total - draft, draft },
    units: { available: count(unitStatus, "available"), reserved: count(unitStatus, "reserved"), sold: count(unitStatus, "sold") },
    registrations: { pending: pendingRegs, last30: regs30 },
    mls: { views: count(events, "view"), whatsapp: count(events, "whatsapp_click"), contacts: count(events, "contact"), newListings },
    newAccounts: { agencies: count(newOrgs, false), developers: count(newOrgs, true) },
    // Logins without a role are old agency logins
    activeLogins: { agency: count(logins, "agency") + count(logins, null), developer: count(logins, "developer") },
  };
}
