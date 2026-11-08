// lib/server/xml-exports.ts
// Helpers for XML export links: which properties a link contains, and the Kyero v3 XML.
import "server-only";
import { randomBytes } from "node:crypto";
import { ObjectId, type Document, type Filter } from "mongodb";
import { collections } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { blockedAgencyIds, matchesQuery, networkFilter, propertyFilters } from "@/lib/server/network";
import type { FeatureKey, PropertyType } from "@/lib/constants/property";
import type { XmlExport, XmlExportDoc, XmlExportFilters } from "@/types/xmlExport";

/* ---------- Export links ---------- */

/** Secret part of the feed URL: 32 random hex characters. */
export const newToken = () => randomBytes(16).toString("hex");

/** Filter: this agency's export links (optionally one link). */
export function scopedExport(agencyId: string, _id?: ObjectId) {
  return { agencyId, ...(_id ? { _id } : {}) };
}

/** Finds one of the current agency's export links by id, or null. */
export async function findXmlExport(id: unknown) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  const agencyId = await getAgencyId();
  return collections.xmlExports.findOne(scopedExport(agencyId, new ObjectId(id)));
}

/** Database document → the plain object the browser uses. */
export function toXmlExport(d: XmlExportDoc): XmlExport {
  return {
    id: d._id.toHexString(),
    name: d.name,
    token: d.token,
    format: d.format,
    filters: d.filters,
    createdAt: d.createdAt.toISOString(),
    lastFetchedAt: d.lastFetchedAt?.toISOString() ?? null,
  };
}

/* ---------- Which properties a link contains ---------- */

/**
 * The network rule (lib/server/network.ts) including the agency's own properties, plus the link's filters.
 * A suspended / cancelled agency's links come back empty (not only its own properties: partners' too).
 * `fields`: load only these (counting needs just enough to apply the text filter).
 */
export async function matchExport(agencyId: string, f: XmlExportFilters, fields?: Record<string, 1>) {
  const blocked = await blockedAgencyIds();
  if (blocked.includes(agencyId)) return [];
  const query: Filter<Document> = { ...networkFilter(agencyId, blocked, true), ...propertyFilters(f) };
  const docs = await collections.properties.find(query, fields ? { projection: fields } : {}).sort({ createdAt: -1 }).toArray();
  return docs
    .filter((p) => matchesQuery(p, f.query))
    .map((property) => ({ property, mine: property.agencyId === agencyId }));
}

/** How many properties a link contains, split into own and partner properties. */
export async function countExport(agencyId: string, f: XmlExportFilters) {
  const items = await matchExport(agencyId, f, { agencyId: 1, code: 1, town: 1, province: 1, reference: 1 });
  const mine = items.filter((i) => i.mine).length;
  return { mine, partners: items.length - mine };
}

/* ---------- Kyero v3 XML ---------- */

const KYERO_TYPE: Record<PropertyType, string> = {
  apartment: "apartment",
  penthouse: "penthouse",
  groundFloor: "apartment",
  townhouse: "town house",
  bungalow: "bungalow",
  villa: "villa",
  plot: "plot",
  commercial: "commercial",
};

const KYERO_FEATURE: Record<FeatureKey, string> = {
  pool: "Communal pool",
  privatePool: "Private pool",
  garage: "Garage",
  parking: "Parking",
  seaView: "Sea views",
  ac: "Air conditioning",
  terrace: "Terrace",
  garden: "Garden",
  lift: "Lift",
  furnished: "Furnished",
  storage: "Storage room",
  solarium: "Solarium",
};

/** Characters XML 1.0 doesn't allow anywhere, even in CDATA (control characters, lone surrogates): one would break the whole feed. */
const INVALID_XML = /[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu;

/** Text in CDATA; "]]>" inside the text is split so it can't end the CDATA early. */
const cdata = (s: unknown) => `<![CDATA[${String(s ?? "").replace(INVALID_XML, "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
const coordinate = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? String(n) : "");
const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? String(Math.round(n)) : "");
const kyeroDate = (d: unknown) => (d instanceof Date ? d : new Date()).toISOString().slice(0, 19).replace("T", " ");

/** One property → <property>. Never includes the address; the point only when the address isn't hidden. */
function propertyXml(p: Document): string {
  const lat = coordinate(p.latitude);
  const lng = coordinate(p.longitude);
  const location = !p.hideAddress && lat && lng ? `<location><latitude>${lat}</latitude><longitude>${lng}</longitude></location>` : "";
  const features: string[] = (p.features ?? []).map((f: FeatureKey) => KYERO_FEATURE[f]).filter(Boolean);
  const hasPool = (p.features ?? []).some((f: string) => f === "pool" || f === "privatePool");
  const desc = ["en", "es", "pl"]
    .filter((lang) => p.description?.[lang])
    .map((lang) => `<${lang}>${cdata(p.description[lang])}</${lang}>`)
    .join("");
  const images = (p.photos ?? [])
    .map((ph: Document, i: number) => `<image id="${i + 1}"><url>${cdata(ph.url)}</url></image>`)
    .join("");
  const energy = p.energyRating && p.energyRating !== "inProgress" ? String(p.energyRating).toUpperCase() : "";

  return [
    "<property>",
    `<id>${p._id.toHexString()}</id>`,
    `<date>${kyeroDate(p.updatedAt)}</date>`,
    `<ref>${cdata(p.code ?? p.reference)}</ref>`,
    `<price>${num(p.price)}</price>`,
    "<currency>EUR</currency>",
    "<price_freq>sale</price_freq>",
    `<new_build>${p.condition === "newBuild" ? 1 : 0}</new_build>`,
    `<type>${cdata(KYERO_TYPE[p.type as PropertyType] ?? p.type)}</type>`,
    `<town>${cdata(p.town)}</town>`,
    `<province>${cdata(p.province)}</province>`,
    "<country>Spain</country>",
    location,
    `<beds>${num(p.bedrooms)}</beds>`,
    `<baths>${num(p.bathrooms)}</baths>`,
    `<pool>${hasPool ? 1 : 0}</pool>`,
    `<surface_area><built>${num(p.builtM2)}</built>${p.plotM2 ? `<plot>${num(p.plotM2)}</plot>` : ""}</surface_area>`,
    energy ? `<energy_rating><consumption>${energy}</consumption></energy_rating>` : "",
    features.length ? `<features>${features.map((f) => `<feature>${cdata(f)}</feature>`).join("")}</features>` : "",
    desc ? `<desc>${desc}</desc>` : "",
    images ? `<images>${images}</images>` : "",
    "</property>",
  ].join("");
}

/** The full Kyero v3 feed for a list of properties. */
export function buildKyeroXml(properties: Document[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<root>",
    `<kyero><feed_version>3</feed_version><generated>${new Date().toISOString()}</generated></kyero>`,
    ...properties.map(propertyXml),
    "</root>",
  ].join("\n");
}
