// lib/server/admin/properties.ts
// Read helpers for Admin → Properties. Plain server functions: only server pages can call them.
import "server-only";
import { collections } from "@/lib/db";
import { countEvents } from "@/lib/server/property-events";
import type { AdminProperty } from "@/types/admin";
import type { PropertyStatsSummary } from "@/types/property-events";
import { toAdminProperty } from "./agencies";
import { requireAdmin } from "./current-admin";

/** Views and WhatsApp clicks per property (30 days and all time), all agencies or one. Read-only. */
export async function statsByProperty(agencyId?: string): Promise<PropertyStatsSummary> {
  await requireAdmin();
  return countEvents("property", agencyId);
}

/** Every property on the platform (all agencies), newest first. */
export async function listAllProperties(): Promise<AdminProperty[]> {
  await requireAdmin();
  const docs = await collections.properties.find().sort({ createdAt: -1 }).toArray();
  return docs.map(toAdminProperty);
}
