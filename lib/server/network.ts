// lib/server/network.ts
// The network rule in one place: which properties an agency may see from partners.
// Used by Search, XML exports and (later) client pages, so they can never disagree.
import "server-only";
import { ObjectId, type Document, type Filter } from "mongodb";
import { collections } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { toProperty } from "@/lib/server/properties";
import type { PropertyCondition } from "@/lib/constants/property";
import type { AgencyDoc } from "@/types/models";
import type { NetworkAgency, NetworkProperty, SearchFilters, SearchResults } from "@/types/search";
import type { XmlExportFilters } from "@/types/xmlExport";
import type { ListingResults, PublicListing } from "@/types/listings";
import { PROPERTY_CODE_RE } from "@/lib/server/property-code";
import { namesWithin, normalizeLocation, resolveLocation } from "@/lib/locations";
import { kmFromCentre, locationFilter, searchArea } from "@/lib/server/locations";

export const SEARCH_PAGE_SIZE = 10;

/** Agencies whose properties are off the network: suspended or cancelled by the admin. */
export async function blockedAgencyIds(): Promise<string[]> {
  const docs = await collections.agencies
    .find({ status: { $in: ["suspended", "cancelled"] } }, { projection: { _id: 1 } })
    .toArray();
  return docs.map((d) => d._id.toHexString());
}

/**
 * - own properties (only with includeOwn): active and not hidden
 * - partner properties: active, shared, not hidden
 * - never: hidden by the admin (moderation), or from a suspended / cancelled agency (own included)
 */
export function networkFilter(agencyId: string, blocked: string[], includeOwn: boolean): Filter<Document> {
  return {
    status: "active",
    hidden: { $ne: true },
    moderation: null, // missing or null = not hidden by the admin
    $and: [
      { agencyId: { $nin: blocked } },
      includeOwn ? { $or: [{ agencyId }, { agencyId: { $ne: agencyId }, shared: true }] } : { agencyId: { $ne: agencyId }, shared: true },
    ],
  };
}

/**
 * New build or resale. A property without a condition counts as resale (the XML export writes <new_build>0</new_build> for it),
 * so "resale" is "not new build" rather than an exact match.
 */
export function conditionFilter(condition: PropertyCondition): Filter<Document> {
  return condition === "newBuild" ? { condition: "newBuild" } : { condition: { $ne: "newBuild" } };
}

/**
 * Locations, area, type, new build / resale, price, bedrooms and bathrooms as a MongoDB filter. The text query is checked with `matchesQuery`.
 * Location ids are already checked by checkLocationIds; they match the ids set on each property from its town text
 * (lib/server/locations.ts): a province includes its towns, a town its localities and urbanisations.
 */
export function propertyFilters(
  f: Omit<XmlExportFilters, "query" | "condition"> & { condition?: XmlExportFilters["condition"]; locations?: string[]; minBaths?: number },
): Filter<Document> {
  return {
    ...locationFilter(f.locations ?? []),
    ...(f.area !== "all" ? { area: f.area } : {}),
    ...(f.type !== "all" ? { type: f.type } : {}),
    // Saved export links from before this filter have no condition: everything
    ...(f.condition && f.condition !== "all" ? conditionFilter(f.condition) : {}),
    ...(f.minPrice != null || f.maxPrice != null
      ? { price: { ...(f.minPrice != null ? { $gte: f.minPrice } : {}), ...(f.maxPrice != null ? { $lte: f.maxPrice } : {}) } }
      : {}),
    ...(f.minBeds > 0 ? { bedrooms: { $gte: f.minBeds } } : {}),
    ...(f.minBaths ? { bathrooms: { $gte: f.minBaths } } : {}),
  };
}

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Code, town, province or reference contains the query, ignoring accents ("Jávea" = "javea").
 * If the query is a known location (lib/locations), a property in it also matches by any of its names
 * ("Calpe" finds "Calp"), and a municipality includes its districts and urbanisations ("Orihuela" finds "La Zenia").
 */
export function matchesQuery(p: Document, query: string) {
  const q = normalize(query.trim());
  if (!q) return true;
  if (normalize(`${p.code ?? ""} ${p.town ?? ""} ${p.province ?? ""} ${p.reference ?? ""}`).includes(q)) return true;
  const location = resolveLocation(query);
  return !!location && namesWithin(location).has(normalizeLocation(String(p.town ?? "")));
}

/** A property as the search shows it: for a partner's property the exact address is removed when the owner hides it. */
function toNetworkProperty(d: Document, viewerAgencyId: string): NetworkProperty {
  const p = toProperty(d);
  const own = String(d.agencyId) === viewerAgencyId;
  // A hidden address also hides the exact point (the distance from the town says enough)
  const hide = p.hideAddress && !own;
  return { ...p, address: hide ? "" : p.address, ...(hide ? { latitude: null, longitude: null } : {}), agencyId: String(d.agencyId), own };
}

function toNetworkAgency(a: AgencyDoc): NetworkAgency {
  return {
    id: a._id.toHexString(),
    name: a.name,
    logoUrl: a.logo ?? null,
    town: a.town ?? "",
    contactPerson: a.contactPerson ?? "",
    phone: a.phone ?? "",
    whatsapp: a.whatsapp ?? "",
    email: a.contactEmail || a.email || "",
    website: a.website ?? "",
    address: [a.street, [a.postcode, a.town].filter(Boolean).join(" "), a.province].filter(Boolean).join(", "),
  };
}

async function networkAgencies(ids: string[]): Promise<NetworkAgency[]> {
  const objectIds = [...new Set(ids)].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length === 0) return [];
  const docs = await collections.agencies.find({ _id: { $in: objectIds } }).toArray();
  return docs.map(toNetworkAgency);
}

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  priceAsc: { price: 1, _id: 1 },
  priceDesc: { price: -1, _id: 1 },
} as const;

/** One page of a query, sorted; a text query is matched in code (accents ignored) on the small fields first. */
async function pagedSearch(query: Filter<Document>, f: SearchFilters, page: number) {
  const sort = SORTS[f.sort];
  const props = collections.properties;
  let total: number;
  let docs: Document[];
  let current: number;

  if (!f.query.trim()) {
    total = await props.countDocuments(query);
    current = Math.min(page, Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE)));
    docs = await props.find(query).sort(sort).skip((current - 1) * SEARCH_PAGE_SIZE).limit(SEARCH_PAGE_SIZE).toArray();
  } else {
    // Text query: match on the small fields first, then load only the page we show
    const candidates = await props.find(query, { projection: { code: 1, town: 1, province: 1, reference: 1 } }).sort(sort).toArray();
    const ids = candidates.filter((p) => matchesQuery(p, f.query)).map((p) => p._id);
    total = ids.length;
    current = Math.min(page, Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE)));
    const pageIds = ids.slice((current - 1) * SEARCH_PAGE_SIZE, current * SEARCH_PAGE_SIZE);
    const byId = new Map((await props.find({ _id: { $in: pageIds } }).toArray()).map((d) => [d._id.toHexString(), d]));
    docs = pageIds.flatMap((id) => byId.get(id.toHexString()) ?? []);
  }
  return { docs, total, page: current, pageCount: Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE)) };
}

/** Search page: one page of partners' properties matching the filters, plus their agencies. */
export async function searchNetwork(f: SearchFilters, page: number): Promise<SearchResults> {
  const agencyId = await getAgencyId();
  // The agency's own active properties are included too (marked as its own), so the search is never empty for it
  // Location (and "within X km" of it) as its own filter; the rest as usual
  const area = await searchArea(f.locations, f.radiusKm);
  const query = { ...networkFilter(agencyId, await blockedAgencyIds(), true), ...propertyFilters({ ...f, locations: [] }), ...area.filter };
  const { docs, ...paging } = await pagedSearch(query, f, page);
  const items = docs.map((d) => ({ ...toNetworkProperty(d, agencyId), distanceFromSearch: kmFromCentre(d, area.centre) }));
  return { items, agencies: await networkAgencies(items.map((p) => p.agencyId)), ...paging };
}

/** One partner property for the detail page, or null if it isn't (or is no longer) on the network for this agency. */
export async function getNetworkProperty(id: string): Promise<{ property: NetworkProperty; agency: NetworkAgency | null } | null> {
  if (!ObjectId.isValid(id)) return null;
  const agencyId = await getAgencyId();
  const doc = await collections.properties.findOne({ _id: new ObjectId(id), ...networkFilter(agencyId, await blockedAgencyIds(), true) });
  if (!doc) return null;
  const property = toNetworkProperty(doc, agencyId);
  const [agency] = await networkAgencies([property.agencyId]);
  return { property, agency: agency ?? null };
}

/* ---------- Public /listings (no login): every property on the network, with no agency details ---------- */

/** Active, shared, not hidden by the agency or the admin, agency not suspended / cancelled. */
export function publicFilter(blocked: string[]): Filter<Document> {
  return { status: "active", shared: true, hidden: { $ne: true }, moderation: null, agencyId: { $nin: blocked }, code: { $type: "string" } };
}

/**
 * Built field by field (never by spreading a property document), so the agency, its contact details,
 * its own reference, the commission and the address can't slip through.
 */
function toPublicListing(d: Document): PublicListing {
  const p = toProperty(d);
  return {
    code: p.code,
    type: p.type,
    condition: p.condition,
    town: p.town,
    province: p.province,
    area: p.area,
    price: p.price,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    builtM2: p.builtM2,
    plotM2: p.plotM2,
    yearBuilt: p.yearBuilt,
    energyRating: p.energyRating,
    features: p.features,
    description: p.description,
    photos: p.photos.map((ph) => ({ url: ph.url })),
    createdAt: p.createdAt,
  };
}

export async function searchPublicListings(f: SearchFilters, page: number): Promise<ListingResults> {
  const area = await searchArea(f.locations, f.radiusKm);
  const query = { ...publicFilter(await blockedAgencyIds()), ...propertyFilters({ ...f, locations: [] }), ...area.filter };
  const { docs, ...paging } = await pagedSearch(query, f, page);
  // Only the distance from the searched place, never the coordinates themselves
  return { items: docs.map((d) => ({ ...toPublicListing(d), distanceFromSearch: kmFromCentre(d, area.centre) })), ...paging };
}

/** One public listing by its code ("KT-4821"), or null if it isn't public (any more). */
export async function getPublicListing(code: string): Promise<PublicListing | null> {
  const normalized = code.toUpperCase();
  if (!PROPERTY_CODE_RE.test(normalized)) return null;
  const doc = await collections.properties.findOne({ ...publicFilter(await blockedAgencyIds()), code: normalized });
  return doc ? toPublicListing(doc) : null;
}
