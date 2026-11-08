// lib/geo.ts
// Coordinates and straight-line distance, shared by the property form and the server (the server's
// result is the one saved), so both always show the same number.

export type LatLng = { lat: number; lng: number };

export const isLatitude = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= -90 && v <= 90;
export const isLongitude = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= -180 && v <= 180;

const EARTH_RADIUS_KM = 6371.0088; // mean Earth radius (IUGG)
const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Straight-line ("as the crow flies") distance in km between two points: the Haversine formula on a
 * sphere, accurate to about 0.5 %. Not the road distance, which is usually longer.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance from the town centre as stored: km with one decimal, or null when either point is missing. */
export function distanceFromTownKm(property: Partial<LatLng> | null, town: LatLng | null): number | null {
  if (!town || !property || !isLatitude(property.lat) || !isLongitude(property.lng)) return null;
  return Math.round(haversineKm({ lat: property.lat, lng: property.lng }, town) * 10) / 10;
}

/** Coordinates are stored with 6 decimals (about 10 cm): enough, and stable when compared. */
export const roundCoordinate = (v: number) => Math.round(v * 1e6) / 1e6;
