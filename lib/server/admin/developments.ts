// lib/server/admin/developments.ts
// Admin → Promotores → [developer] → Promociones → [development]: loads the pair for a page, checked together.
// The development must belong to that developer (and the developer must be a developer account): any other
// combination of ids in the URL is a 404, so a pasted link can't show one developer's development under another.
import "server-only";
import { notFound } from "next/navigation";
import { collections } from "@/lib/db";
import { requireAdmin } from "./current-admin";
import { findDeveloperDoc } from "./developers";
import { findProjectDoc } from "@/lib/server/developer/developments";

export async function loadAdminDevelopment(developerId: string, developmentId: string) {
  await requireAdmin();
  const developer = await findDeveloperDoc(developerId);
  const development = developer && (await findProjectDoc(developmentId, developerId));
  if (!developer || !development) notFound();
  const unitCount = await collections.devUnits.countDocuments({ developerId, developmentId });
  return { developer: { id: developerId, name: developer.name }, development, unitCount };
}

/** The developer only (pages that aren't about one development). */
export async function loadAdminDeveloper(developerId: string) {
  await requireAdmin();
  const developer = await findDeveloperDoc(developerId);
  if (!developer) notFound();
  return { id: developerId, name: developer.name, status: developer.status };
}

export type DeveloperOption = { id: string; name: string; town: string; email: string; status: string };

/** Every developer account, for the "which developer?" picker (A–Z). */
export async function listDeveloperOptions(): Promise<DeveloperOption[]> {
  await requireAdmin();
  const docs = await collections.agencies
    .find({ accountType: "developer" }, { projection: { name: 1, town: 1, email: 1, status: 1 } })
    .collation({ locale: "es", strength: 1 })
    .sort({ name: 1 })
    .toArray();
  return docs.map((d) => ({ id: d._id.toHexString(), name: d.name, town: d.town ?? "", email: d.email ?? "", status: d.status ?? "active" }));
}
