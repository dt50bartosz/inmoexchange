// lib/locations/index.ts
// All searchable locations, and how to search and resolve them. No UI here.
// To add another region: add its data file in ./data and its entries to PROVINCES below.
import { ALICANTE_MUNICIPALITIES, ALICANTE_SUB_LOCATIONS } from "./data/alicante";
import type { Location, MunicipalityRecord, SubLocationRecord } from "./types";

export type { Location, LocationType } from "./types";

const PROVINCES: { province: string; municipalities: MunicipalityRecord[]; subLocations: SubLocationRecord[] }[] = [
  { province: "Alicante", municipalities: ALICANTE_MUNICIPALITIES, subLocations: ALICANTE_SUB_LOCATIONS },
];

/** Lower case, no accents, apostrophes/dashes/slashes as spaces, single spaces: "L'Alfàs del Pi" → "l alfas del pi". */
export function normalizeLocation(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[''`´/\-.,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Leading articles people often leave out: "La Nucía" = "Nucía", "El Campello" = "Campello". */
const ARTICLE = /^(l|el|la|els|les|los|las) /;
export const withoutArticle = (s: string) => s.replace(ARTICLE, "");

export const LOCATIONS: Location[] = PROVINCES.flatMap(({ province, municipalities, subLocations }) => {
  const byId = new Map(municipalities.map((m) => [m.id, m]));
  return [
    ...municipalities.map<Location>((m) => ({
      id: m.id,
      name: m.name,
      aliases: m.aliases,
      type: "municipality",
      parentId: null,
      parentName: null,
      province,
      region: m.region,
      ine: m.ine,
    })),
    ...subLocations.map<Location>((s) => ({
      id: s.id,
      name: s.name,
      aliases: s.aliases,
      type: s.type,
      parentId: s.parentId,
      parentName: byId.get(s.parentId)?.name ?? null,
      province,
      region: s.region,
      ine: null,
    })),
  ];
});

const BY_ID = new Map(LOCATIONS.map((l) => [l.id, l]));

/** Every normalised name of a location (name, aliases, each language of "A / B"), with and without article. */
function keysOf(l: Location): string[] {
  const names = [l.name, ...l.name.split(" / "), ...l.aliases].map(normalizeLocation);
  return [...new Set(names.flatMap((n) => [n, withoutArticle(n)]))];
}
const INDEX = LOCATIONS.map((l) => ({ location: l, keys: keysOf(l) }));

export const getLocation = (id: string) => BY_ID.get(id) ?? null;

/**
 * Locations matching what the user typed, best first: exact name, then starts with, then a word starting with,
 * then contains. Municipalities before the places inside them. One result per location, whichever alias matched.
 */
export function searchLocations(query: string, limit = 12): Location[] {
  const q = normalizeLocation(query);
  if (!q) return [];
  const scored: { location: Location; score: number }[] = [];
  for (const { location, keys } of INDEX) {
    let best = Infinity;
    for (const k of keys) {
      const score = k === q ? 0 : k.startsWith(q) ? 1 : k.split(" ").some((w) => w.startsWith(q)) ? 2 : k.includes(q) ? 3 : Infinity;
      if (score < best) best = score;
    }
    if (best !== Infinity) scored.push({ location, score: best * 2 + (location.type === "municipality" ? 0 : 1) });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.location.name.localeCompare(b.location.name, "es"))
    .slice(0, limit)
    .map((s) => s.location);
}

/** The location a free-text town name refers to (exact name or alias, accents and articles ignored), or null. */
export function resolveLocation(text: string): Location | null {
  const q = normalizeLocation(text);
  if (!q) return null;
  const qa = withoutArticle(q);
  const hits = INDEX.filter(({ keys }) => keys.includes(q) || keys.includes(qa)).map((i) => i.location);
  // A municipality wins over a sub-location of the same name
  return hits.find((l) => l.type === "municipality") ?? hits[0] ?? null;
}

/**
 * Every normalised name that counts as "in" a location: its own names, plus (for a municipality)
 * the names of its districts, villages and urbanisations. Used to match property towns in searches.
 */
export function namesWithin(location: Location): Set<string> {
  const names = new Set(keysOf(location));
  if (location.type === "municipality") {
    for (const l of LOCATIONS) if (l.parentId === location.id) for (const k of keysOf(l)) names.add(k);
  }
  return names;
}

