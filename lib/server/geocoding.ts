// lib/server/geocoding.ts
// Address → coordinates, for precise property locations and for towns without coordinates in our
// location data. Every answer is cached in MongoDB ("geocode_cache"), so the same address is asked once.
//
// Provider: Nominatim (OpenStreetMap) by default — free, no key, no extra package. Its usage policy
// (https://operations.osmfoundation.org/policies/nominatim/) asks for at most 1 request per second, an
// identifying User-Agent and caching; all three are done here. Settings (environment variables):
//   GEOCODER_URL         search endpoint (default https://nominatim.openstreetmap.org/search); any
//                        Nominatim-compatible service works, e.g. a self-hosted one or a paid Nominatim API
//   GEOCODER_USER_AGENT  who is asking, e.g. "inmoexchange.com (admin@inmoexchange.com)" — required by Nominatim
//   GEOCODER_API_KEY     optional, sent as "key=" for providers that need one
import "server-only";
import { db } from "@/lib/db";
import { isLatitude, isLongitude, roundCoordinate, type LatLng } from "@/lib/geo";
import { normalizeLocation } from "@/lib/locations";

export type GeocodeResult = LatLng & { label: string };
export type GeocodeOutcome = { ok: true; result: GeocodeResult } | { ok: false; error: "not_found" | "unavailable" };

type CacheDoc = { _id: string; result: GeocodeResult | null; createdAt: Date; expiresAt: Date | null };
const cache = db.collection<CacheDoc>("geocode_cache");

const URL_DEFAULT = "https://nominatim.openstreetmap.org/search";
/** A miss is asked again after a week (the address may have been added to OpenStreetMap meanwhile). */
const MISS_TTL_MS = 7 * 24 * 3600e3;
const TIMEOUT_MS = 8000;

// One request at a time, at least 1.1 s apart (per server instance)
let queue: Promise<unknown> = Promise.resolve();
let last = 0;
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    return fn();
  });
  queue = run.catch(() => {});
  return run;
}

/**
 * Coordinates for a free-text place in Spain ("Calle Mayor 1, Torrevieja, Alicante"). Cached; never
 * invents a point: no confident match → not_found, provider down → unavailable (not cached).
 */
export async function geocode(query: string): Promise<GeocodeOutcome> {
  const key = normalizeLocation(query);
  if (!key) return { ok: false, error: "not_found" };

  const hit = await cache.findOne({ _id: key });
  if (hit && (!hit.expiresAt || hit.expiresAt > new Date())) {
    return hit.result ? { ok: true, result: hit.result } : { ok: false, error: "not_found" };
  }

  let result: GeocodeResult | null;
  try {
    result = await throttled(() => askProvider(query));
  } catch (err) {
    console.error("[geocode] provider failed", err);
    return { ok: false, error: "unavailable" };
  }
  const now = new Date();
  await cache.replaceOne({ _id: key }, { result, createdAt: now, expiresAt: result ? null : new Date(now.getTime() + MISS_TTL_MS) }, { upsert: true });
  return result ? { ok: true, result } : { ok: false, error: "not_found" };
}

async function askProvider(query: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", countrycodes: "es", addressdetails: "0" });
  if (process.env.GEOCODER_API_KEY) params.set("key", process.env.GEOCODER_API_KEY);
  const res = await fetch(`${process.env.GEOCODER_URL || URL_DEFAULT}?${params}`, {
    headers: {
      "User-Agent": process.env.GEOCODER_USER_AGENT || "inmoexchange property platform",
      "Accept-Language": "es,en",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const [first] = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!first || !isLatitude(lat) || !isLongitude(lng)) return null;
  return { lat: roundCoordinate(lat), lng: roundCoordinate(lng), label: first.display_name ?? query };
}
