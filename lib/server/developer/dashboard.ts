// lib/server/developer/dashboard.ts
// Developer panel home: developments, units by status and the latest client registrations. Scoped by developerId.
import "server-only";
import { collections } from "@/lib/db";
import type { UnitStatus } from "@/lib/constants/developers";
import type { DeveloperRegistration } from "@/types/developers";
import { listDeveloperRegistrations, registrationCounts } from "./registrations";

export type DeveloperDashboard = {
  developments: { total: number; published: number; drafts: number; preparedByPlatform: number };
  units: Record<UnitStatus, number>;
  pendingRegistrations: number;
  latestRegistrations: DeveloperRegistration[];
};

export async function getDeveloperDashboard(developerId: string): Promise<DeveloperDashboard> {
  const [developments, unitRows, counts, latest] = await Promise.all([
    collections.devProjects.find({ developerId }, { projection: { visibility: 1, createdBy: 1 } }).toArray(),
    collections.devUnits.aggregate<{ _id: UnitStatus; n: number }>([{ $match: { developerId } }, { $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
    registrationCounts(developerId),
    listDeveloperRegistrations(developerId, { limit: 5 }),
  ]);
  const drafts = developments.filter((d) => (d.visibility ?? "published") === "draft");
  const units = { available: 0, reserved: 0, sold: 0 };
  for (const r of unitRows) units[r._id] = r.n;
  return {
    developments: {
      total: developments.length,
      published: developments.length - drafts.length,
      drafts: drafts.length,
      preparedByPlatform: drafts.filter((d) => d.createdBy?.role === "admin").length,
    },
    units,
    pendingRegistrations: counts.pending,
    latestRegistrations: latest.slice(0, 5),
  };
}
