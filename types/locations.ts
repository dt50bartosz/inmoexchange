import type { RegionKey } from "@/lib/constants/options";

/**
 * Kinds of place, top down: province → municipality (INE) → places inside a municipality.
 * "urbanisation" and "village" are curated (Costa Blanca); "locality" (a village or population centre) and
 * "district" (a neighbourhood) come from GeoNames.
 */
export type PlaceType = "province" | "municipality" | "locality" | "district" | "village" | "urbanisation";
export type SubPlaceType = Exclude<PlaceType, "province" | "municipality">;

/** A Spanish province (collection "location_provinces"), from INE. `_id` is "es-<INE code>", e.g. "es-03". */
export interface ProvinceDoc {
  _id: string;
  ine: string;
  /** As INE writes it, e.g. "Alicante/Alacant". */
  officialName: string;
  /** For display, e.g. "Alicante / Alacant". */
  name: string;
  /** Other names: each official language, older Spanish names ("Gerona"). */
  aliases: string[];
  /** Coastal tourism regions in it ("Costa Blanca"): geographic, not administrative. */
  coasts: string[];
  population: number;
  /** Normalised full names (lib/locations normalizeLocation), for matching a property's province text. */
  names: string[];
  /** `names` plus every word-start suffix ("de la horadada", "horadada"): prefix searches use these. */
  keys: string[];
  sortKey: string;
}

/**
 * A municipality (INE) or a place inside one (collection "locations").
 * Ids: "es-03-133" (municipality), "es-03-133-la-mata" (curated place), "es-03-099-g2511758" (GeoNames place).
 */
export interface LocationDoc {
  _id: string;
  type: Exclude<PlaceType, "province">;
  /** Where the record comes from: INE (municipalities), the curated Costa Blanca list, or GeoNames. */
  source: "ine" | "curated" | "geonames";
  provinceId: string;
  provinceName: string;
  /** The municipality itself, or the one the place belongs to. */
  municipalityId: string;
  /** Display name of that municipality (places inside one only). */
  municipalityName: string | null;
  name: string;
  /** INE name (municipalities only). */
  officialName: string | null;
  aliases: string[];
  ine: string | null;
  geonameId: string | null;
  /** Costa Blanca North / South / inland (Alicante only for now). */
  region: RegionKey | null;
  /** For ranking search results (GeoNames figures; 0 when unknown). */
  population: number;
  /** Centre of the town / place (WGS84, GeoNames); null when unknown — never guessed. */
  lat: number | null;
  lng: number | null;
  names: string[];
  keys: string[];
  sortKey: string;
}

/** One location as the autocomplete and the search page show it. Only what the UI needs. */
export type PlaceOption = {
  id: string;
  name: string;
  type: PlaceType;
  /** Province it is in (null for a province). */
  provinceName: string | null;
  /** Municipality it is in (places inside a municipality only). */
  municipalityName: string | null;
  /** Coasts of a province ("Costa Blanca"), otherwise null. */
  detail: string | null;
};

export type PlaceSearchResult = { items: PlaceOption[]; hasMore: boolean };

/** Where a property is, from its town / province text: ids in the collections above, null if unknown. */
export type PropertyPlace = { provinceId: string | null; municipalityId: string | null; locationId: string | null };
