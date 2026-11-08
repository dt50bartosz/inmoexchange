import { z } from "zod";
import { PROPERTY_CONDITIONS, PROPERTY_TYPES } from "@/lib/constants/property";
import { REGION_KEYS } from "@/lib/constants/options";
import { LOCATION_ID_RE } from "@/lib/schemas/locations";
import type { SearchFilters } from "@/types/search";

/*
 * Search filters live in the URL (?loc=es-03-133,es-30&minPrice=…&page=2) so results can be shared and the back
 * button works. Anything missing or invalid in the URL falls back to its default instead of failing.
 */

/** "Within X km" choices; 0 = only the location itself. */
export const SEARCH_RADII_KM = [0, 1, 2, 5, 10, 20, 50] as const;

/**
 * "es-03-133,es-30" → well-formed ids, no repeats (a few at most). Which exist is checked in the database,
 * which then keeps the first MAX_SEARCH_LOCATIONS that do.
 */
const locationList = z
  .string()
  .catch("")
  .transform((s) => [...new Set(s.split(",").map((id) => id.trim()).filter((id) => LOCATION_ID_RE.test(id)))].slice(0, 10));

const optionalPrice = z.coerce.number().int().positive().nullable().catch(null);

export const searchParamsSchema = z.object({
  query: z.string().trim().max(60).catch(""),
  loc: locationList,
  radiusKm: z.coerce.number().refine((v) => (SEARCH_RADII_KM as readonly number[]).includes(v)).catch(0),
  area: z.union([z.literal("all"), z.enum(REGION_KEYS)]).catch("all"),
  type: z.union([z.literal("all"), z.enum(PROPERTY_TYPES)]).catch("all"),
  condition: z.union([z.literal("all"), z.enum(PROPERTY_CONDITIONS)]).catch("all"),
  minPrice: optionalPrice,
  maxPrice: optionalPrice,
  minBeds: z.coerce.number().int().min(0).max(10).catch(0),
  minBaths: z.coerce.number().int().min(0).max(10).catch(0),
  sort: z.enum(["newest", "priceAsc", "priceDesc"]).catch("newest"),
  page: z.coerce.number().int().min(1).catch(1),
});

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  query: "",
  locations: [],
  radiusKm: 0,
  area: "all",
  type: "all",
  condition: "all",
  minPrice: null,
  maxPrice: null,
  minBeds: 0,
  minBaths: 0,
  sort: "newest",
};

/** URL → filters and page. Takes Next's searchParams (a value can be a string or a list). */
export function parseSearchParams(raw: Record<string, string | string[] | undefined>): { filters: SearchFilters; page: number } {
  const first = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  // Links from the earlier province / town fields (?province=es-03&town=es-03-133) still work
  const loc = [first.loc, first.town || first.province].filter(Boolean).join(",");
  const { page, loc: locations, ...rest } = searchParamsSchema.parse({ ...first, loc });
  return { filters: { ...rest, locations }, page };
}

/** Filters and page → query string, leaving out default values ("" when everything is default). */
export function toSearchQuery(f: SearchFilters, page = 1): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(f) as [keyof SearchFilters, SearchFilters[keyof SearchFilters]][]) {
    if (key === "locations") {
      if (f.locations.length) params.set("loc", f.locations.join(","));
      continue;
    }
    if (value === null || value === "" || value === DEFAULT_SEARCH_FILTERS[key]) continue;
    params.set(key, String(value));
  }
  if (page > 1) params.set("page", String(page));
  const s = params.toString();
  return s ? `?${s}` : "";
}
