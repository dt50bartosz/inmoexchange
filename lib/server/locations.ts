// lib/server/locations.ts
// Spanish locations in MongoDB: the import, the autocomplete search, the checks on search filters,
// and which province / municipality / place a property is in.
import "server-only";
import { createHash } from "node:crypto";
import type { AnyBulkWriteOperation, Collection, Document } from "mongodb";
import { collections, db, ensureIndexes } from "@/lib/db";
import { ALICANTE_MUNICIPALITIES, ALICANTE_SUB_LOCATIONS } from "@/lib/locations/data/alicante";
import { normalizeLocation, withoutArticle } from "@/lib/locations";
import { distanceFromTownKm, isLatitude, isLongitude, roundCoordinate, type LatLng } from "@/lib/geo";
import { geocode } from "@/lib/server/geocoding";
import { LOCATION_ID_RE, MAX_SEARCH_LOCATIONS, MIN_LOCATION_QUERY, MUNICIPALITY_ID_RE, PROVINCE_ID_RE } from "@/lib/schemas/locations";
import type { LocationDoc, PlaceOption, PlaceSearchResult, PlaceType, PropertyPlace, ProvinceDoc } from "@/types/locations";

/*
 * Data import
 * -----------
 * Sources (all under lib/locations/data, rebuilt by the scripts in scripts/locations):
 *   - spain-ine-2025.json: every province (52) and municipality (8,132) — INE, "Relación de municipios y
 *     códigos a 1 de enero de 2025" and "Relación de provincias". Names and ids are INE's.
 *   - spain-localities-geonames.json: villages, population centres and neighbourhoods inside municipalities,
 *     plus population figures for ranking — GeoNames (https://www.geonames.org), CC BY 4.0, attribution required.
 *   - alicante.ts: curated Costa Blanca urbanisations and everyday names (same ids as INE).
 * It runs by itself the first time location data is needed with a new LOCATION_DATA_VERSION, or on demand
 * (POST /api/admin/locations/import). Every record is upserted by its id, so running it again never creates
 * duplicates; records gone from the sources are removed. Afterwards every property is mapped again.
 */
export const LOCATION_DATA_VERSION = "ine-2025+geonames-2026-10.6";

type MetaDoc = {
  _id: string;
  version: string;
  importedAt: Date;
  provinces: number;
  municipalities: number;
  places: number;
  /** Records added or changed, and removed, by the last import. */
  written: number;
  removed: number;
  properties: number;
  /** Properties whose coordinates / distance from the town were filled in or recalculated. */
  coordinates: number;
};
const meta = db.collection<MetaDoc>("meta");

/** The names a place is known by (display name, each language, aliases), normalised, with and without article. */
function namesOf(...names: string[]) {
  const all = names.flatMap((n) => [n, ...n.split(" / ")]).map(normalizeLocation).filter(Boolean);
  return [...new Set(all.flatMap((n) => [n, withoutArticle(n)]))];
}

/** `names` plus every word-start suffix, so "hora" finds "Pilar de la Horadada" with an index prefix scan. */
function keysOf(names: string[]) {
  const keys = new Set<string>();
  for (const n of names) {
    const words = n.split(" ");
    words.forEach((_, i) => keys.add(words.slice(i).join(" ")));
  }
  return [...keys];
}

const sortKeyOf = (name: string) => withoutArticle(normalizeLocation(name));

/**
 * Ranking weight of a curated Costa Blanca place without a GeoNames population: these are established
 * residential areas where the platform's properties are (La Mata, La Zenia…), not hamlets.
 */
const CURATED_MIN_POPULATION = 5000;

type SpainData = {
  provinces: { id: string; ine: string; officialName: string; name: string; aliases: string[]; coasts: string[] }[];
  municipalities: { id: string; ine: string; provinceId: string; officialName: string; name: string; aliases: string[] }[];
};
type GeoNamesData = {
  provincePopulation: Record<string, number>;
  municipalityPopulation: Record<string, number>;
  municipalityAliases: Record<string, string[]>;
  /** Town centre [lat, lng] per municipality */
  municipalityCentre: Record<string, [number, number]>;
  /** [geonameId, name, municipality id, type, population, lat, lng] */
  places: [string, string, string, "locality" | "district", number, number, number][];
};

async function buildDocuments() {
  // Loaded only when importing (about 2.3 MB together)
  const spain = (await import("@/lib/locations/data/spain-ine-2025.json")).default as SpainData;
  const geo = (await import("@/lib/locations/data/spain-localities-geonames.json")).default as unknown as GeoNamesData;
  const alicante = new Map(ALICANTE_MUNICIPALITIES.map((m) => [m.id, m]));

  const provinces: ProvinceDoc[] = spain.provinces.map((p) => {
    const names = namesOf(p.name, p.officialName, ...p.aliases);
    return {
      _id: p.id,
      ine: p.ine,
      officialName: p.officialName,
      name: p.name,
      aliases: p.aliases,
      coasts: p.coasts,
      population: geo.provincePopulation[p.id] ?? 0,
      names,
      keys: keysOf([...names, ...namesOf(...p.coasts)]),
      sortKey: sortKeyOf(p.name),
    };
  });
  const provinceName = new Map(provinces.map((p) => [p._id, p.name]));

  const municipalities: LocationDoc[] = spain.municipalities.map((m) => {
    const extra = alicante.get(m.id); // same ids; adds everyday names and the Costa Blanca area
    const name = extra?.name ?? m.name;
    const aliases = [...new Set([...m.aliases, ...(extra?.aliases ?? []), ...(geo.municipalityAliases[m.id] ?? [])])];
    const names = namesOf(name, m.officialName, ...aliases);
    return {
      _id: m.id,
      type: "municipality",
      source: "ine",
      provinceId: m.provinceId,
      provinceName: provinceName.get(m.provinceId) ?? "",
      municipalityId: m.id,
      municipalityName: null,
      name,
      officialName: m.officialName,
      aliases,
      ine: m.ine,
      geonameId: null,
      region: extra?.region ?? null,
      population: geo.municipalityPopulation[m.id] ?? 0,
      lat: geo.municipalityCentre[m.id]?.[0] ?? null,
      lng: geo.municipalityCentre[m.id]?.[1] ?? null,
      names,
      keys: keysOf(names),
      sortKey: sortKeyOf(name),
    };
  });
  const municipalityName = new Map(municipalities.map((m) => [m._id, m.name]));

  // GeoNames population and point of a place, by municipality and name: curated places take them over (they replace that entry)
  const geoPopulation = new Map<string, number>();
  const geoPoint = new Map<string, [number, number]>();
  for (const [, name, municipalityId, , population, lat, lng] of geo.places) {
    for (const n of namesOf(name)) {
      geoPopulation.set(`${municipalityId}|${n}`, Math.max(population, geoPopulation.get(`${municipalityId}|${n}`) ?? 0));
      geoPoint.set(`${municipalityId}|${n}`, [lat, lng]);
    }
  }

  const curated: LocationDoc[] = ALICANTE_SUB_LOCATIONS.map((s) => {
    const names = namesOf(s.name, ...s.aliases);
    const provinceId = s.parentId.slice(0, 5); // "es-03-099" -> "es-03"
    return {
      _id: s.id,
      type: s.type,
      source: "curated",
      provinceId,
      provinceName: provinceName.get(provinceId) ?? "",
      municipalityId: s.parentId,
      municipalityName: municipalityName.get(s.parentId) ?? null,
      name: s.name,
      officialName: null,
      aliases: s.aliases,
      ine: null,
      geonameId: null,
      region: s.region,
      population: Math.max(CURATED_MIN_POPULATION, ...names.map((n) => geoPopulation.get(`${s.parentId}|${n}`) ?? 0)),
      // GeoNames' point for the same place; unknown stays null (the town centre is used instead)
      lat: names.map((n) => geoPoint.get(`${s.parentId}|${n}`)).find(Boolean)?.[0] ?? null,
      lng: names.map((n) => geoPoint.get(`${s.parentId}|${n}`)).find(Boolean)?.[1] ?? null,
      names,
      keys: keysOf(names),
      sortKey: sortKeyOf(s.name),
    };
  });
  // A GeoNames place that is already a curated one (same municipality and name) is left out
  const curatedNames = new Set(curated.flatMap((c) => c.names.map((n) => `${c.municipalityId}|${n}`)));
  const regionOf = new Map(municipalities.map((m) => [m._id, m.region]));

  const places: LocationDoc[] = [];
  for (const [geonameId, name, municipalityId, type, population, lat, lng] of geo.places) {
    if (!municipalityName.has(municipalityId)) continue;
    const names = namesOf(name);
    if (names.some((n) => curatedNames.has(`${municipalityId}|${n}`))) continue;
    const provinceId = municipalityId.slice(0, 5);
    places.push({
      _id: `${municipalityId}-g${geonameId}`,
      type,
      source: "geonames",
      provinceId,
      provinceName: provinceName.get(provinceId) ?? "",
      municipalityId,
      municipalityName: municipalityName.get(municipalityId) ?? null,
      name,
      officialName: null,
      aliases: [],
      ine: null,
      geonameId,
      region: regionOf.get(municipalityId) ?? null,
      population,
      lat,
      lng,
      names,
      keys: keysOf(names),
      sortKey: sortKeyOf(name),
    });
  }

  return { provinces, municipalities, places: [...curated, ...places] };
}

/**
 * Writes the documents by id: new and changed ones only (each carries a hash of its content), so running
 * the import again over unchanged data writes nothing. Documents no longer in the source are removed.
 * Returns how many were written and removed.
 */
async function syncAll<T extends { _id: string }>(col: Collection<T>, docs: T[]) {
  const c = col as unknown as Collection<{ _id: string; hash?: string }>;
  const existing = new Map((await c.find({}, { projection: { hash: 1 } }).toArray()).map((d) => [d._id, d.hash]));
  const hashed = docs.map((d) => ({ ...d, hash: createHash("sha1").update(JSON.stringify(d)).digest("base64") }));
  const changed = hashed.filter((d) => existing.get(d._id) !== d.hash);
  for (let i = 0; i < changed.length; i += 1000) {
    const ops: AnyBulkWriteOperation<{ _id: string }>[] = changed
      .slice(i, i + 1000)
      .map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } }));
    await c.bulkWrite(ops, { ordered: false });
  }
  const wanted = new Set(docs.map((d) => d._id));
  const gone = [...existing.keys()].filter((id) => !wanted.has(id));
  if (gone.length) await c.deleteMany({ _id: { $in: gone } });
  return { written: changed.length, removed: gone.length };
}

/** Imports (or re-imports) the location data and maps every property again. Safe to run any number of times. */
export async function importLocations() {
  await ensureIndexes();
  // Indexes of the earlier province / town dropdowns, no longer used
  for (const name of ["type_keys", "province_type_keys"]) await collections.locations.dropIndex(name).catch(() => {});
  const { provinces, municipalities, places } = await buildDocuments();
  const provinceChanges = await syncAll(collections.locationProvinces, provinces);
  const locationChanges = await syncAll(collections.locations, [...municipalities, ...places]);
  const properties = await backfillPropertyPlaces();
  const coordinates = await backfillPropertyCoordinates();
  const summary = {
    version: LOCATION_DATA_VERSION,
    importedAt: new Date(),
    provinces: provinces.length,
    municipalities: municipalities.length,
    places: places.length,
    written: provinceChanges.written + locationChanges.written,
    removed: provinceChanges.removed + locationChanges.removed,
    properties,
    coordinates,
  };
  await meta.replaceOne({ _id: "locations" }, summary, { upsert: true });
  return summary;
}

let ready: Promise<unknown> | null = null;

/** Makes sure this version of the location data is in the database (imports it once if not). */
export function ensureLocationData() {
  ready ??= (async () => {
    const current = await meta.findOne({ _id: "locations" });
    if (current?.version !== LOCATION_DATA_VERSION) {
      const summary = await importLocations();
      console.info("[locations] imported", summary);
    }
  })().catch((err) => {
    ready = null; // try again on the next request
    throw err;
  });
  return ready;
}

/* ---------- Autocomplete ---------- */

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Candidate = { option: PlaceOption; names: string[]; population: number; sortKey: string };

function provinceOption(p: Pick<ProvinceDoc, "_id" | "name" | "coasts">): PlaceOption {
  return { id: p._id, name: p.name, type: "province", provinceName: null, municipalityName: null, detail: p.coasts.join(", ") || null };
}

function locationOption(l: Pick<LocationDoc, "_id" | "name" | "type" | "provinceName" | "municipalityName">): PlaceOption {
  return { id: l._id, name: l.name, type: l.type, provinceName: l.provinceName, municipalityName: l.municipalityName, detail: null };
}

const TYPE_ORDER: Record<PlaceType, number> = { province: 0, municipality: 1, urbanisation: 2, village: 2, locality: 2, district: 3 };

/**
 * 0 = a name is the text, 1 = a name starts with it, 2 = a later word starts with it, 3 = it's inside a word.
 * An exact name only jumps ahead for provinces and towns: a hamlet called "Tor" must not push Torrevieja down.
 */
function tier(names: string[], q: string, type: PlaceType) {
  if (names.includes(q) && (type === "province" || type === "municipality")) return 0;
  if (names.some((n) => n.startsWith(q))) return 1;
  if (names.some((n) => n.includes(` ${q}`))) return 2;
  return 3;
}

const PROJECTION = { name: 1, type: 1, provinceName: 1, municipalityName: 1, names: 1, population: 1, sortKey: 1 } as const;
/** Candidates ranked per request: plenty for a few pages of 8, never the whole collection. */
const POOL = 250;

/**
 * Provinces, municipalities and places whose name (or another name: other language, older spelling)
 * matches the text, accents and case ignored. Best first: exact name, then starts with, then a later word
 * starts with, then contains (only when there are few better matches). Within that, provinces first, then
 * bigger places first. `offset` pages through the ranked list.
 */
export async function searchLocations(text: string, limit: number, offset = 0): Promise<PlaceSearchResult> {
  const q = normalizeLocation(text);
  if (q.length < MIN_LOCATION_QUERY) return { items: [], hasMore: false };
  await ensureLocationData();

  const prefix = { $regex: `^${escapeRegex(q)}` };
  const [provinces, exact, starting] = await Promise.all([
    collections.locationProvinces.find({ keys: prefix }, { projection: { name: 1, coasts: 1, names: 1, keys: 1, population: 1, sortKey: 1 } }).toArray(),
    collections.locations.find({ names: q }, { projection: PROJECTION }).limit(50).toArray(),
    collections.locations.find({ keys: prefix }, { projection: PROJECTION }).sort({ population: -1 }).limit(POOL).toArray(),
  ]);
  const byId = new Map<string, LocationDoc | (typeof exact)[number]>();
  for (const d of [...exact, ...starting]) byId.set(d._id, d);
  // Also places with the text inside a word ("rrevieja" → Torrevieja); they rank after every word match
  if (q.length >= 3) {
    const inside = await collections.locations
      .find({ names: { $regex: escapeRegex(q) } }, { projection: PROJECTION })
      .sort({ population: -1 })
      .limit(POOL)
      .toArray();
    for (const d of inside) if (!byId.has(d._id)) byId.set(d._id, d);
  }

  const candidates: Candidate[] = [
    ...provinces.map((p) => ({ option: provinceOption(p), names: [...p.names, ...p.keys.filter((k) => !p.names.includes(k))], population: p.population, sortKey: p.sortKey })),
    ...[...byId.values()].map((d) => ({ option: locationOption(d), names: d.names, population: d.population, sortKey: d.sortKey })),
  ];
  const ranked = candidates
    .map((c) => ({ c, t: tier(c.names, q, c.option.type) }))
    .sort(
      (a, b) =>
        a.t - b.t ||
        Number(b.c.option.type === "province") - Number(a.c.option.type === "province") ||
        b.c.population - a.c.population ||
        TYPE_ORDER[a.c.option.type] - TYPE_ORDER[b.c.option.type] ||
        a.c.sortKey.localeCompare(b.c.sortKey, "es")
    )
    .map((x) => x.c.option);

  return { items: ranked.slice(offset, offset + limit), hasMore: ranked.length > offset + limit };
}

/* ---------- Search filters ---------- */

/**
 * Checks the location ids of a search against the database: unknown or malformed ids are dropped and the
 * search runs without them. Returns the ids kept (in the order given) and their names from the database —
 * never from the browser.
 */
export async function checkLocationIds(ids: string[]): Promise<{ ids: string[]; places: PlaceOption[] }> {
  const wanted = [...new Set(ids.filter((id) => LOCATION_ID_RE.test(id)))].slice(0, 10);
  if (wanted.length === 0) return { ids: [], places: [] };
  await ensureLocationData();
  const provinceIds = wanted.filter((id) => PROVINCE_ID_RE.test(id));
  const otherIds = wanted.filter((id) => !PROVINCE_ID_RE.test(id));
  const [provinces, locations] = await Promise.all([
    provinceIds.length ? collections.locationProvinces.find({ _id: { $in: provinceIds } }, { projection: { name: 1, coasts: 1 } }).toArray() : [],
    otherIds.length
      ? collections.locations.find({ _id: { $in: otherIds } }, { projection: { name: 1, type: 1, provinceName: 1, municipalityName: 1 } }).toArray()
      : [],
  ]);
  const found = new Map<string, PlaceOption>([...provinces.map((p) => [p._id, provinceOption(p)] as const), ...locations.map((l) => [l._id, locationOption(l)] as const)]);
  // The first ones that exist, up to the limit per search
  const places = wanted.flatMap((id) => found.get(id) ?? []).slice(0, MAX_SEARCH_LOCATIONS);
  return { ids: places.map((p) => p.id), places };
}

/**
 * Checked location ids → MongoDB filter on the ids stored on each property. A province includes all its
 * properties, a municipality includes its localities and urbanisations, a place only itself.
 */
export function locationFilter(ids: string[]): Document {
  if (ids.length === 0) return {};
  const provinces = ids.filter((id) => PROVINCE_ID_RE.test(id));
  const municipalities = ids.filter((id) => MUNICIPALITY_ID_RE.test(id));
  const places = ids.filter((id) => !PROVINCE_ID_RE.test(id) && !MUNICIPALITY_ID_RE.test(id));
  return {
    $or: [
      ...(provinces.length ? [{ provinceId: { $in: provinces } }] : []),
      ...(municipalities.length ? [{ municipalityId: { $in: municipalities } }] : []),
      ...(places.length ? [{ locationId: { $in: places } }] : []),
    ],
  };
}

/* ---------- Which province / municipality / place a property is in ---------- */

/**
 * Returns a function that maps a property's town / province text to location ids, with a cache
 * (a feed import asks for the same towns many times). The text stays the property's own; the ids are
 * only for searching. Never a guess: a name shared by places in different municipalities only maps
 * when one of them is clearly meant (see below); otherwise the property keeps only its province.
 */
export async function createPlaceResolver() {
  await ensureLocationData();
  return placeResolver();
}

/** A municipality is meant before a curated place, and a curated place before a GeoNames one. */
const SOURCE_PRIORITY = { ine: 0, curated: 1, geonames: 2 } as const;

/** Levenshtein distance (letters added, removed or changed), giving up above `max` (then max + 1). */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, row[j]);
    }
    if (rowMin > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

/** createPlaceResolver without waiting for the import (the import itself uses it to map properties). */
async function placeResolver() {
  const provinceIds = new Map<string, string>();
  for (const p of await collections.locationProvinces.find({}, { projection: { names: 1, coasts: 1 } }).toArray()) {
    for (const n of [...p.names, ...p.coasts.map(normalizeLocation)]) provinceIds.set(n, p._id);
  }
  // "Alicante (Costa Blanca)", "Alicante, Spain": the first part counts too
  const provinceOf = (text: string) =>
    provinceIds.get(normalizeLocation(text)) ?? provinceIds.get(normalizeLocation(text.split(/[(,]/)[0])) ?? null;

  // Municipality names per province, loaded once per resolver for the typo-tolerant match
  const provinceTowns = new Map<string, { _id: string; names: string[] }[]>();
  const closestMunicipality = async (provinceId: string, n: string): Promise<string | null> => {
    if (n.length < 5) return null; // short names are too easy to confuse
    if (!provinceTowns.has(provinceId)) {
      provinceTowns.set(provinceId, await collections.locations.find({ provinceId, type: "municipality" }, { projection: { names: 1 } }).toArray());
    }
    const allowed = n.length >= 9 ? 2 : 1;
    let best: string | null = null;
    let bestDistance = Infinity;
    let tie = false;
    for (const m of provinceTowns.get(provinceId) ?? []) {
      const d = Math.min(...m.names.map((name) => editDistance(n, withoutArticle(name), allowed)));
      if (d < bestDistance) [best, bestDistance, tie] = [m._id, d, false];
      else if (d === bestDistance && m._id !== best) tie = true;
    }
    return bestDistance <= allowed && !tie ? best : null;
  };

  const cache = new Map<string, PropertyPlace>();
  return async (town: string, province: string): Promise<PropertyPlace> => {
    const key = `${town}\u0000${province}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const provinceId = provinceOf(province);
    const n = normalizeLocation(town);
    let place: PropertyPlace = { provinceId, municipalityId: null, locationId: null };
    if (n) {
      const candidates = await collections.locations
        .find({ names: { $in: [n, withoutArticle(n)] }, ...(provinceId ? { provinceId } : {}) }, { projection: { source: 1, provinceId: 1, municipalityId: 1 } })
        .toArray();
      // Only the best kind of match counts, and it has to point at one municipality
      const best = Math.min(...candidates.map((c) => SOURCE_PRIORITY[c.source]));
      const top = candidates.filter((c) => SOURCE_PRIORITY[c.source] === best);
      if (top.length > 0 && new Set(top.map((c) => c.municipalityId)).size === 1) {
        const chosen = top.length === 1 ? top[0] : (top.find((c) => c._id === c.municipalityId) ?? top[0]);
        place = { provinceId: chosen.provinceId, municipalityId: chosen.municipalityId, locationId: chosen._id };
      } else if (top.length === 0 && provinceId) {
        // No exact name: a misspelt town in the province ("Torreivieja" → Torrevieja), only when one town is clearly meant
        const close = await closestMunicipality(provinceId, withoutArticle(n));
        if (close) place = { provinceId, municipalityId: close, locationId: close };
      }
    }
    cache.set(key, place);
    return place;
  };
}

/** Sets provinceId / municipalityId / locationId on every property whose text maps differently now. Returns how many changed. */
async function backfillPropertyPlaces(): Promise<number> {
  const resolve = await placeResolver();
  const docs = await collections.properties
    .find({}, { projection: { town: 1, province: 1, provinceId: 1, municipalityId: 1, locationId: 1 } })
    .toArray();
  const ops: AnyBulkWriteOperation<Document>[] = [];
  for (const d of docs) {
    const place = await resolve(String(d.town ?? ""), String(d.province ?? ""));
    if (d.provinceId !== place.provinceId || d.municipalityId !== place.municipalityId || d.locationId !== place.locationId) {
      ops.push({ updateOne: { filter: { _id: d._id }, update: { $set: place } } });
    }
  }
  for (let i = 0; i < ops.length; i += 1000) await collections.properties.bulkWrite(ops.slice(i, i + 1000), { ordered: false });
  return ops.length;
}

/** The location ids for one property's town / province text (manual create and edit). */
export async function placeOf(town: string, province: string): Promise<PropertyPlace> {
  return (await createPlaceResolver())(town, province);
}

/* ---------- Coordinates and distance from the town centre ---------- */

/** Where a property's coordinates came from: the town centre, a geocoded address, typed in, or the agency's feed. */
export type CoordinatesSource = "town" | "address" | "manual" | "feed";
export type TownCentre = LatLng & { source: "database" | "geocoder" };

/** Centres of locations by id: a place without its own point uses its municipality's. */
async function centresById(ids: string[]): Promise<Map<string, LatLng>> {
  const docs = await collections.locations
    .find({ _id: { $in: [...new Set(ids)] } }, { projection: { lat: 1, lng: 1, municipalityId: 1 } })
    .toArray();
  const missing = docs.filter((d) => d.lat == null && d.municipalityId !== d._id).map((d) => d.municipalityId);
  const parents = missing.length
    ? new Map((await collections.locations.find({ _id: { $in: missing } }, { projection: { lat: 1, lng: 1 } }).toArray()).map((d) => [d._id, d]))
    : new Map<string, { lat: number | null; lng: number | null }>();
  const out = new Map<string, LatLng>();
  for (const d of docs) {
    const point = d.lat != null && d.lng != null ? d : parents.get(d.municipalityId);
    if (point && isLatitude(point.lat) && isLongitude(point.lng)) out.set(d._id, { lat: point.lat, lng: point.lng });
  }
  return out;
}

/**
 * Centre of the town a property's town / province text names: our location data (GeoNames points) first;
 * if the town isn't there, or has no point, the geocoder (cached). Null when neither knows it — never guessed.
 */
export async function townCentre(town: string, province: string, opts: { geocodeMissing?: boolean } = {}): Promise<TownCentre | null> {
  if (!town.trim()) return null;
  const place = await placeOf(town, province);
  if (place.locationId) {
    const centre = (await centresById([place.locationId])).get(place.locationId);
    if (centre) return { ...centre, source: "database" };
  }
  if (opts.geocodeMissing === false) return null;
  const found = await geocode([town, province, "España"].filter(Boolean).join(", "));
  return found.ok ? { lat: found.result.lat, lng: found.result.lng, source: "geocoder" } : null;
}

type CoordinatesInput = { town: string; province: string; latitude: number | null; longitude: number | null; coordinatesSource: CoordinatesSource | null };
export type PropertyCoordinates = {
  latitude: number | null;
  longitude: number | null;
  coordinatesSource: CoordinatesSource | null;
  /** Straight-line km from the town centre (one decimal); null without both points. */
  distanceFromTown: number | null;
  /** The same point as GeoJSON (2dsphere index) for "within X km" searches; null without coordinates. */
  geo: GeoPoint | null;
};
type GeoPoint = { type: "Point"; coordinates: [number, number] };
const geoPoint = (lat: number | null, lng: number | null): GeoPoint | null =>
  lat !== null && lng !== null ? { type: "Point", coordinates: [lng, lat] } : null;
/** Adds the GeoJSON point to coordinates. */
const withGeo = (c: Omit<PropertyCoordinates, "geo">): PropertyCoordinates => ({ ...c, geo: geoPoint(c.latitude, c.longitude) });

/**
 * The coordinates and distance saved with a property — worked out on the server, whatever the browser
 * showed. Valid coordinates given are kept; missing (or out of range) ones, and ones that were only a town
 * centre, become the current town's centre, marked as such. The distance is always recalculated.
 */
export async function propertyCoordinates(input: CoordinatesInput): Promise<PropertyCoordinates> {
  const centre = await townCentre(input.town, input.province);
  const ownPoint = input.coordinatesSource !== "town" || !centre;
  if (ownPoint && isLatitude(input.latitude) && isLongitude(input.longitude)) {
    const point = { lat: roundCoordinate(input.latitude), lng: roundCoordinate(input.longitude) };
    return withGeo({ latitude: point.lat, longitude: point.lng, coordinatesSource: input.coordinatesSource ?? "manual", distanceFromTown: distanceFromTownKm(point, centre) });
  }
  if (!centre) return withGeo({ latitude: null, longitude: null, coordinatesSource: null, distanceFromTown: null });
  return withGeo({ latitude: centre.lat, longitude: centre.lng, coordinatesSource: "town", distanceFromTown: 0 });
}

/**
 * For every property: missing (or invalid) coordinates, and town-centre ones, become its town centre from our location data;
 * the distance from the town is recalculated. Valid coordinates are never changed. No geocoder calls here
 * (thousands of feed properties); a property whose town has no centre keeps no coordinates.
 * Returns how many properties changed.
 */
export async function backfillPropertyCoordinates(): Promise<number> {
  const docs = await collections.properties
    .find({}, { projection: { locationId: 1, latitude: 1, longitude: 1, coordinatesSource: 1, distanceFromTown: 1, geo: 1 } })
    .toArray();
  const centres = await centresById(docs.flatMap((d) => (typeof d.locationId === "string" ? [d.locationId] : [])));
  const ops: AnyBulkWriteOperation<Document>[] = [];
  for (const d of docs) {
    const centre = typeof d.locationId === "string" ? (centres.get(d.locationId) ?? null) : null;
    // A town centre follows the town; any other valid point is the property's own and stays
    const valid = isLatitude(d.latitude) && isLongitude(d.longitude) && (d.coordinatesSource !== "town" || !centre);
    const next: PropertyCoordinates = withGeo(
      valid
        ? { latitude: d.latitude, longitude: d.longitude, coordinatesSource: d.coordinatesSource ?? "manual", distanceFromTown: distanceFromTownKm({ lat: d.latitude, lng: d.longitude }, centre) }
        : centre
          ? { latitude: centre.lat, longitude: centre.lng, coordinatesSource: "town", distanceFromTown: 0 }
          : { latitude: null, longitude: null, coordinatesSource: null, distanceFromTown: null }
    );
    const same = (Object.keys(next) as (keyof PropertyCoordinates)[]).every((k) => JSON.stringify(d[k] ?? null) === JSON.stringify(next[k]));
    if (!same) ops.push({ updateOne: { filter: { _id: d._id }, update: { $set: next } } });
  }
  for (let i = 0; i < ops.length; i += 1000) await collections.properties.bulkWrite(ops.slice(i, i + 1000), { ordered: false });
  return ops.length;
}

/**
 * For feed imports: coordinates from the feed when valid, else the town centre from our location data;
 * distance from the town centre. Centres are cached for the whole import; never calls the geocoder.
 */
export async function createCoordinatesResolver() {
  const cache = new Map<string, LatLng | null>();
  return async (locationId: string | null, latitude: number | null, longitude: number | null, source: CoordinatesSource | null): Promise<PropertyCoordinates> => {
    let centre: LatLng | null = null;
    if (locationId) {
      if (!cache.has(locationId)) cache.set(locationId, (await centresById([locationId])).get(locationId) ?? null);
      centre = cache.get(locationId) ?? null;
    }
    if (isLatitude(latitude) && isLongitude(longitude)) {
      const point = { lat: roundCoordinate(latitude), lng: roundCoordinate(longitude) };
      return withGeo({ latitude: point.lat, longitude: point.lng, coordinatesSource: source ?? "feed", distanceFromTown: distanceFromTownKm(point, centre) });
    }
    if (!centre) return withGeo({ latitude: null, longitude: null, coordinatesSource: null, distanceFromTown: null });
    return withGeo({ latitude: centre.lat, longitude: centre.lng, coordinatesSource: "town", distanceFromTown: 0 });
  };
}

/* ---------- "Within X km" searches ---------- */

const EARTH_RADIUS_KM = 6378.1; // MongoDB $centerSphere takes radians: km / Earth radius

export type SearchArea = {
  /** MongoDB filter for the properties in the search area ({} = anywhere). */
  filter: Document;
  /** Centre of the chosen location when searching by distance, else null. */
  centre: LatLng | null;
};

/**
 * The area a search covers. No radius: the location's own properties (locationFilter). With a radius
 * (towns and places only; a province has no single centre): its own properties plus every property whose
 * coordinates are within that many km of the location's centre, wherever its town is.
 */
export async function searchArea(ids: string[], radiusKm: number): Promise<SearchArea> {
  const own = locationFilter(ids);
  const id = ids[0];
  if (!radiusKm || !id || PROVINCE_ID_RE.test(id)) return { filter: own, centre: null };
  const centre = (await centresById([id])).get(id) ?? null;
  if (!centre) return { filter: own, centre: null };
  const near = { geo: { $geoWithin: { $centerSphere: [[centre.lng, centre.lat], radiusKm / EARTH_RADIUS_KM] } } };
  return { filter: { $or: [...((own.$or as Document[]) ?? []), near] }, centre };
}

/** Straight-line km from the search centre, for the result cards (null without both points). */
export const kmFromCentre = (d: Document, centre: LatLng | null) =>
  centre ? distanceFromTownKm({ lat: d.latitude ?? undefined, lng: d.longitude ?? undefined }, centre) : null;
