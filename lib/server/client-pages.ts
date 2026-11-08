// lib/server/client-pages.ts
// Client pages: an agent's shortlist of properties for one buyer, shared as a public link /p/<token>.
// The public page shows ONLY the agency that made it: partner agencies' names, contact details,
// references and addresses never leave the server.
import "server-only";
import { randomBytes } from "node:crypto";
import { ObjectId, type Document } from "mongodb";
import { getTranslations } from "next-intl/server";
import { collections } from "@/lib/db";
import { blockedAgencyIds, conditionFilter, networkFilter } from "@/lib/server/network";
import type { PropertyCondition } from "@/lib/constants/property";
import { toProperty } from "@/lib/server/properties";
import { namesWithin, normalizeLocation, resolveLocation } from "@/lib/locations";
import type { AgencyDoc } from "@/types/models";
import type {
  ClientPage,
  ClientPageDoc,
  Property as AgentProperty,
  PublicAgency,
  PublicClientPage,
  PublicProperty,
} from "@/types/client-pages";

/** Secret part of the public link: 128 random bits, URL-safe. */
export const newPageToken = () => randomBytes(16).toString("base64url");

export function scopedPage(agencyId: string, _id?: ObjectId) {
  return { agencyId, ...(_id ? { _id } : {}) };
}

export function toClientPage(d: ClientPageDoc): ClientPage {
  return {
    id: d._id.toHexString(),
    contactId: d.contactId,
    buyerName: d.buyerName,
    ...(d.buyerPhone ? { buyerPhone: d.buyerPhone } : {}),
    token: d.token,
    status: d.status,
    ...(d.expiresAt ? { expiresAt: d.expiresAt } : {}),
    welcomeMessage: d.welcomeMessage,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    ...(d.lastViewedAt ? { lastViewedAt: d.lastViewedAt.toISOString() } : {}),
    viewCount: d.viewCount,
    items: d.items.map((i) => ({
      propertyId: i.propertyId,
      agentComment: i.agentComment,
      addedAt: i.addedAt.toISOString(),
      ...(i.reaction ? { reaction: i.reaction } : {}),
      ...(i.clientComment ? { clientComment: i.clientComment } : {}),
      ...(i.viewingRequestedAt ? { viewingRequestedAt: i.viewingRequestedAt.toISOString() } : {}),
      seenByAgent: i.seenByAgent,
    })),
  };
}

/* ---------- Properties an agent can put on a page: own + partners' shared (the network rule) ---------- */

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

async function agencyNames(ids: string[]) {
  const valid = [...new Set(ids)].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const docs = valid.length ? await collections.agencies.find({ _id: { $in: valid } }, { projection: { name: 1 } }).toArray() : [];
  return new Map(docs.map((a) => [a._id.toHexString(), a.name]));
}

/** Property documents → the agent's view (with the partner agency's name, which the client never gets). */
async function toAgentProperties(agencyId: string, docs: Document[]): Promise<AgentProperty[]> {
  const t = await getTranslations("panel.properties");
  const names = await agencyNames(docs.map((d) => String(d.agencyId)));
  return docs.map((d) => {
    const own = d.agencyId === agencyId;
    return {
      id: d._id.toHexString(),
      ref: String(d.code ?? d.reference ?? ""),
      title: t("titleFormat", { type: t(`types.${d.type}`), town: d.town || t("noTown") }),
      town: d.town ?? "",
      type: d.type,
      condition: d.condition === "newBuild" ? "newBuild" : "resale",
      price: d.price,
      bedrooms: d.bedrooms ?? 0,
      bathrooms: d.bathrooms ?? 0,
      builtM2: d.builtM2 ?? 0,
      ...(d.plotM2 ? { plotM2: d.plotM2 } : {}),
      features: [],
      ...(d.photos?.[0]?.url ? { image: d.photos[0].url } : {}),
      source: own ? "own" : "network",
      ...(own ? {} : { listingAgency: names.get(String(d.agencyId)) ?? "Partner agency" }),
    };
  });
}

export type PoolFilters = {
  text: string;
  priceMin: number | null;
  priceMax: number | null;
  bedsMin: number;
  /** Towns (free text from the CRM buyer). Empty = anywhere. */
  areas: string[];
  types: string[];
  condition: "all" | PropertyCondition;
  source: "all" | "own" | "network";
};

const POOL_LIMIT = 60;

/** Search for the editor: properties this agency may show a client, cheapest first, at most 60. */
export async function searchPool(agencyId: string, f: PoolFilters): Promise<AgentProperty[]> {
  const query: Document = {
    ...networkFilter(agencyId, await blockedAgencyIds(), true),
    ...(f.types.length ? { type: { $in: f.types } } : {}),
    ...(f.condition !== "all" ? conditionFilter(f.condition) : {}),
    ...(f.priceMin != null || f.priceMax != null
      ? { price: { ...(f.priceMin != null ? { $gte: f.priceMin } : {}), ...(f.priceMax != null ? { $lte: f.priceMax } : {}) } }
      : {}),
    ...(f.bedsMin > 0 ? { bedrooms: { $gte: f.bedsMin } } : {}),
  };
  if (f.source === "own") query.$and = [...(query.$and ?? []), { agencyId }];
  if (f.source === "network") query.$and = [...(query.$and ?? []), { agencyId: { $ne: agencyId } }];

  const q = normalize(f.text);
  // Each buyer area: its own name, or (for a known location) all its names and the places inside it
  const areaNames = new Set(
    f.areas.flatMap((a) => {
      const location = resolveLocation(a);
      return location ? [...namesWithin(location)] : [normalizeLocation(a)];
    })
  );
  const docs = (await collections.properties.find(query).sort({ price: 1 }).limit(2000).toArray())
    .filter((d) => !areaNames.size || areaNames.has(normalizeLocation(String(d.town ?? ""))))
    .filter((d) => !q || normalize(`${d.code ?? ""} ${d.town ?? ""} ${d.province ?? ""} ${d.reference ?? ""}`).includes(q))
    .slice(0, POOL_LIMIT);
  return toAgentProperties(agencyId, docs);
}

/** The shortlisted properties that are still available to this agency (sold / unshared ones drop out). */
export async function availableProperties(agencyId: string, ids: string[]): Promise<AgentProperty[]> {
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (!objectIds.length) return [];
  const docs = await collections.properties
    .find({ _id: { $in: objectIds }, ...networkFilter(agencyId, await blockedAgencyIds(), true) })
    .toArray();
  return toAgentProperties(agencyId, docs);
}

/* ---------- The public page ---------- */

const todayMadrid = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/** The page behind a public token, if it may be shown: live, not expired, agency not suspended. */
export async function findLivePage(token: unknown) {
  if (typeof token !== "string" || token.length < 10 || token.length > 64) return null;
  const page = await collections.clientPages.findOne({ token });
  if (!page || page.status !== "live" || (page.expiresAt && page.expiresAt < todayMadrid())) return null;
  if (!ObjectId.isValid(page.agencyId)) return null;
  const agency = await collections.agencies.findOne({ _id: new ObjectId(page.agencyId) });
  if (!agency || agency.status === "suspended" || agency.status === "cancelled") return null;
  return { page, agency };
}

function toPublicAgency(a: AgencyDoc): PublicAgency {
  return {
    name: a.name,
    logoUrl: a.logo ?? null,
    contactPerson: a.contactPerson ?? "",
    phone: a.phone ?? "",
    whatsapp: a.whatsapp ?? "",
    email: a.contactEmail || a.email || "",
    website: a.website ?? "",
  };
}

/**
 * What the client sees. Built field by field (never by spreading a property document),
 * so nothing about partner agencies can slip through.
 */
export async function getPublicPage(token: string): Promise<PublicClientPage | null> {
  const found = await findLivePage(token);
  if (!found) return null;
  const { page, agency } = found;

  // Only properties still on the network for the page's agency, in the agent's order
  const ids = page.items.map((i) => i.propertyId).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const docs = ids.length
    ? await collections.properties.find({ _id: { $in: ids }, ...networkFilter(page.agencyId, await blockedAgencyIds(), true) }).toArray()
    : [];
  const byId = new Map(docs.map((d) => [d._id.toHexString(), d]));

  const properties: PublicProperty[] = page.items.flatMap((item) => {
    const doc = byId.get(item.propertyId);
    if (!doc) return [];
    const p = toProperty(doc);
    const own = doc.agencyId === page.agencyId;
    return [
      {
        id: p.id,
        code: p.code,
        type: p.type,
        condition: p.condition,
        town: p.town,
        province: p.province,
        price: p.price,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        builtM2: p.builtM2,
        plotM2: p.plotM2,
        features: p.features,
        photos: p.photos.map((ph) => ({ id: ph.id, url: ph.url, key: null })),
        description: p.description,
        energyRating: p.energyRating,
        address: own && !p.hideAddress ? p.address : "",
        agentComment: item.agentComment,
        reaction: item.reaction ?? null,
        clientComment: item.clientComment ?? "",
        viewingRequested: !!item.viewingRequestedAt,
      },
    ];
  });

  await collections.clientPages.updateOne({ _id: page._id }, { $inc: { viewCount: 1 }, $set: { lastViewedAt: new Date() } });

  return {
    buyerFirstName: page.buyerName.trim().split(/\s+/)[0] ?? "",
    welcomeMessage: page.welcomeMessage,
    agency: toPublicAgency(agency),
    properties,
  };
}
