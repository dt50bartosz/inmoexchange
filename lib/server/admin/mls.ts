// lib/server/admin/mls.ts
// Admin → MLS: how healthy the shared property network is. Read-only; every number comes from the database.
// "Live" = what other agencies and the public see: active, shared, not hidden by the agency or the admin,
// agency not suspended / cancelled (same rule as lib/server/network.ts publicFilter, without the code check).
import "server-only";
import type { Document } from "mongodb";
import { collections } from "@/lib/db";
import { requireAdmin } from "./current-admin";

export const STALE_STEPS = [60, 90, 180] as const;
/** Fewer photos than this is flagged as "few photos". */
export const MIN_PHOTOS = 5;

export const QUALITY_CHECKS = ["noPhotos", "fewPhotos", "noDescription", "noPrice", "noLocation", "noCoordinates"] as const;
export type QualityCheck = (typeof QUALITY_CHECKS)[number];

export type MlsListing = { id: string; code: string; reference: string; agencyId: string; agencyName: string; town: string; price: number | null; updatedAt: string | null; issues: QualityCheck[] };

export type MlsDuplicateGroup = { key: string; listings: MlsListing[] };

export type MlsAgencyRow = {
  agencyId: string;
  agencyName: string;
  blocked: boolean;
  live: number;
  private: number;
  hidden: number;
  moderated: number;
  sold: number;
  stale90: number;
  withIssues: number;
  lastUpdateAt: string | null;
};

export type MlsMonitor = {
  totals: { all: number; live: number; private: number; hiddenByAgency: number; hiddenByAdmin: number; sold: number; blockedAgency: number; fromFeeds: number };
  quality: Record<QualityCheck, number>;
  /** Live listings with at least one issue, worst first (capped). */
  problemListings: MlsListing[];
  stale: Record<(typeof STALE_STEPS)[number], number>;
  /** Live listings not updated for 90+ days, oldest first (capped). */
  staleListings: MlsListing[];
  duplicates: MlsDuplicateGroup[];
  byAgency: MlsAgencyRow[];
  byProvince: { province: string; live: number; avgPrice: number | null }[];
};

const LIST_CAP = 100;

const descriptionText = (d: Document) => [d.description?.es, d.description?.en, d.description?.pl].filter((s) => typeof s === "string" && s.trim()).length > 0;

export function issuesOf(d: Document): QualityCheck[] {
  const photos = Array.isArray(d.photos) ? d.photos.length : 0;
  const out: QualityCheck[] = [];
  if (photos === 0) out.push("noPhotos");
  else if (photos < MIN_PHOTOS) out.push("fewPhotos");
  if (!descriptionText(d)) out.push("noDescription");
  if (typeof d.price !== "number" || d.price <= 0) out.push("noPrice");
  if (!d.provinceId && !d.locationId) out.push("noLocation");
  if (typeof d.latitude !== "number" || typeof d.longitude !== "number") out.push("noCoordinates");
  return out;
}

/** Same property listed by different agencies: same type, town, bedrooms and exact price, and built size in the same 5 m² band. */
function duplicateKey(d: Document) {
  if (typeof d.price !== "number" || d.price <= 0 || !d.town) return null;
  const town = String(d.town).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const size = typeof d.builtM2 === "number" ? Math.round(d.builtM2 / 5) : "?";
  return `${d.type}|${town}|${d.bedrooms ?? "?"}|${d.price}|${size}`;
}

export async function getMlsMonitor(now = new Date()): Promise<MlsMonitor> {
  await requireAdmin();
  const [docs, orgs] = await Promise.all([
    collections.properties
      .find({}, { projection: { code: 1, reference: 1, agencyId: 1, type: 1, town: 1, province: 1, provinceId: 1, locationId: 1, price: 1, bedrooms: 1, builtM2: 1, photos: { $slice: MIN_PHOTOS }, "description.es": 1, "description.en": 1, "description.pl": 1, latitude: 1, longitude: 1, status: 1, shared: 1, hidden: 1, moderation: 1, source: 1, updatedAt: 1, createdAt: 1 } })
      .toArray(),
    collections.agencies.find({}, { projection: { name: 1, status: 1, accountType: 1 } }).toArray(),
  ]);
  const orgById = new Map(orgs.map((a) => [a._id.toHexString(), a]));
  const blocked = (agencyId: string) => ["suspended", "cancelled"].includes(orgById.get(agencyId)?.status ?? "");
  const day = 86_400_000;
  const ageDays = (d: Document) => {
    const at = d.updatedAt ?? d.createdAt;
    return at instanceof Date ? Math.floor((now.getTime() - at.getTime()) / day) : Infinity;
  };

  const totals = { all: docs.length, live: 0, private: 0, hiddenByAgency: 0, hiddenByAdmin: 0, sold: 0, blockedAgency: 0, fromFeeds: 0 };
  const quality = Object.fromEntries(QUALITY_CHECKS.map((c) => [c, 0])) as Record<QualityCheck, number>;
  const stale = { 60: 0, 90: 0, 180: 0 } as MlsMonitor["stale"];
  const problems: MlsListing[] = [];
  const staleList: (MlsListing & { age: number })[] = [];
  const dupes = new Map<string, MlsListing[]>();
  const agencyRows = new Map<string, MlsAgencyRow>();
  const provinces = new Map<string, { live: number; sum: number; priced: number }>();

  for (const d of docs) {
    const agencyId = String(d.agencyId ?? "");
    const agencyName = orgById.get(agencyId)?.name ?? "Deleted agency";
    const updated = d.updatedAt ?? d.createdAt;
    const row =
      agencyRows.get(agencyId) ??
      { agencyId, agencyName, blocked: blocked(agencyId), live: 0, private: 0, hidden: 0, moderated: 0, sold: 0, stale90: 0, withIssues: 0, lastUpdateAt: null };
    agencyRows.set(agencyId, row);
    if (updated instanceof Date && (!row.lastUpdateAt || updated.toISOString() > row.lastUpdateAt)) row.lastUpdateAt = updated.toISOString();
    if (d.source?.kind === "feed") totals.fromFeeds++;

    // Why a listing is not live: first reason wins, so the totals add up
    if ((d.status ?? "active") !== "active") {
      totals.sold++;
      row.sold++;
      continue;
    }
    if (d.moderation) {
      totals.hiddenByAdmin++;
      row.moderated++;
      continue;
    }
    if (d.hidden === true) {
      totals.hiddenByAgency++;
      row.hidden++;
      continue;
    }
    if (d.shared === false) {
      totals.private++;
      row.private++;
      continue;
    }
    if (row.blocked) {
      totals.blockedAgency++;
      continue;
    }

    totals.live++;
    row.live++;
    const issues = issuesOf(d);
    const listing: MlsListing = {
      id: d._id.toHexString(),
      code: d.code ?? "",
      reference: d.reference ?? "",
      agencyId,
      agencyName,
      town: d.town ?? "",
      price: typeof d.price === "number" ? d.price : null,
      updatedAt: updated instanceof Date ? updated.toISOString() : null,
      issues,
    };
    for (const i of issues) quality[i]++;
    if (issues.length) {
      row.withIssues++;
      problems.push(listing);
    }
    const age = ageDays(d);
    for (const s of STALE_STEPS) if (age >= s) stale[s]++;
    if (age >= 90) {
      row.stale90++;
      staleList.push({ ...listing, age });
    }
    const key = duplicateKey(d);
    if (key) dupes.set(key, [...(dupes.get(key) ?? []), listing]);
    const prov = String(d.province || "Unknown").trim() || "Unknown";
    const p = provinces.get(prov) ?? { live: 0, sum: 0, priced: 0 };
    p.live++;
    if (typeof d.price === "number" && d.price > 0) {
      p.sum += d.price;
      p.priced++;
    }
    provinces.set(prov, p);
  }

  return {
    totals,
    quality,
    problemListings: problems.sort((a, b) => b.issues.length - a.issues.length).slice(0, LIST_CAP),
    stale,
    staleListings: staleList.sort((a, b) => b.age - a.age).slice(0, LIST_CAP).map(({ age: _age, ...l }) => l),
    // Only across different agencies: one agency listing two similar flats in a building is normal
    duplicates: [...dupes.entries()]
      .filter(([, l]) => new Set(l.map((x) => x.agencyId)).size > 1)
      .map(([key, listings]) => ({ key, listings }))
      .slice(0, LIST_CAP),
    byAgency: [...agencyRows.values()].sort((a, b) => b.live - a.live || a.agencyName.localeCompare(b.agencyName)),
    byProvince: [...provinces.entries()]
      .map(([province, p]) => ({ province, live: p.live, avgPrice: p.priced ? Math.round(p.sum / p.priced) : null }))
      .sort((a, b) => b.live - a.live),
  };
}
