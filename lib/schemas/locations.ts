import { z } from "zod";

/**
 * Location ids: "es-03" (province), "es-03-133" (municipality), "es-03-133-la-mata" / "es-03-099-g2511758"
 * (a place inside a municipality).
 */
export const PROVINCE_ID_RE = /^es-\d{2}$/;
export const MUNICIPALITY_ID_RE = /^es-\d{2}-\d{3}$/;
export const LOCATION_ID_RE = /^es-\d{2}(-\d{3}(-[a-z0-9-]{1,60})?)?$/;

/** One location per search (with an optional "within X km" around it). */
export const MAX_SEARCH_LOCATIONS = 1;
/** Fewer letters than this get no suggestions (too many matches to be useful). */
export const MIN_LOCATION_QUERY = 2;
export const LOCATION_PAGE_MAX = 20;

/** GET /api/locations/search?q=tor&limit=8&offset=0 */
export const locationSearchSchema = z.object({
  q: z.string().trim().max(60, "too_long").default(""),
  limit: z.coerce.number().int().min(1).max(LOCATION_PAGE_MAX).catch(8),
  offset: z.coerce.number().int().min(0).max(200).catch(0),
});
