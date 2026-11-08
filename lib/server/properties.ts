// lib/server/properties.ts
// Helpers for the property server actions.
import "server-only";
import { ObjectId, type Document } from "mongodb";
import { collections } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import type { Property } from "@/lib/schemas/property";

/** Filter: this agency's properties (optionally one property). */
export function scopedProperty(agencyId: string, _id?: ObjectId) {
  return { agencyId, ...(_id ? { _id } : {}) };
}

/** Finds one of the current agency's properties by id, or null. */
export async function findProperty(id: unknown) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  const agencyId = await getAgencyId();
  return collections.properties.findOne(scopedProperty(agencyId, new ObjectId(id)));
}

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : String(d ?? ""));

/** Database document → the plain object the browser uses. Only known fields are copied. */
export function toProperty(d: Document): Property {
  return {
    id: d._id.toHexString(),
    type: d.type,
    condition: d.condition,
    code: d.code ?? "",
    reference: d.reference,
    town: d.town,
    province: d.province ?? "",
    area: d.area,
    address: d.address ?? "",
    hideAddress: d.hideAddress ?? true,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    coordinatesSource: d.coordinatesSource ?? null,
    distanceFromTown: d.distanceFromTown ?? null,
    price: d.price,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    builtM2: d.builtM2,
    plotM2: d.plotM2 ?? null,
    yearBuilt: d.yearBuilt ?? null,
    energyRating: d.energyRating ?? null,
    communityFees: d.communityFees ?? null,
    features: d.features ?? [],
    photos: (d.photos ?? []).map((p: Document) => ({
      id: p.id,
      url: p.url,
      key: p.key ?? null,
      ...(p.width ? { width: p.width } : {}),
      ...(p.height ? { height: p.height } : {}),
    })),
    description: { en: d.description?.en ?? "", es: d.description?.es ?? "", pl: d.description?.pl ?? "" },
    status: d.status ?? "active",
    shared: d.shared ?? true,
    commission: d.commission ?? "",
    source: d.source?.kind === "feed" ? { kind: "feed", feedId: d.source.feedId } : { kind: "manual" },
    hidden: d.hidden ?? false,
    priceHistory: (d.priceHistory ?? []).map((h: Document) => ({ price: h.price, date: iso(h.date) })),
    createdAt: iso(d.createdAt),
    updatedAt: iso(d.updatedAt),
  };
}
