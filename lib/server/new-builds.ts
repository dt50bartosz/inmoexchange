// lib/server/new-builds.ts
// The agency panel's "Obra nueva": published developments of active developers, read-only.
// Agencies never see drafts, history, audit fields or other agencies' registrations.
import "server-only";
import { ObjectId, type Filter } from "mongodb";
import { collections } from "@/lib/db";
import { DEFAULT_PROTECTION_DAYS, type ProjectStatus } from "@/lib/constants/developers";
import type { Amenity, RegistrationStatus } from "@/lib/constants/developers";
import type { Collaboration, DevProjectDoc, StoredDocument, Unit } from "@/types/developers";
import type { RegionKey } from "@/lib/constants/options";
import { emptyCollaboration } from "@/lib/server/developer/developments";
import { listUnits } from "@/lib/server/developer/units";

/** The developer as agencies see it on its developments. */
export type NewBuildDeveloper = {
  id: string;
  name: string;
  logo: string | null;
  description: { es: string; en: string };
  website: string;
  contactPerson: string;
  phone: string;
  email: string;
  regions: RegionKey[];
};

export type NewBuildSummary = {
  id: string;
  name: string;
  town: string;
  province: string;
  status: ProjectStatus;
  mainImageUrl: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  currency: string;
  bedroomsMin: number | null;
  bedroomsMax: number | null;
  unitsAvailable: number | null;
  unitsTotal: number | null;
  collaboration: Collaboration;
  expectedCompletion: string;
  developerName: string;
};

export type NewBuildDetail = NewBuildSummary & {
  address: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string;
  description: { es: string; en: string };
  amenities: Amenity[];
  images: { id: string; url: string }[];
  documents: Pick<StoredDocument, "id" | "url" | "kind" | "name" | "size">[];
  protectionDays: number;
  developer: NewBuildDeveloper;
  units: Pick<Unit, "id" | "reference" | "type" | "bedrooms" | "bathrooms" | "builtM2" | "plotM2" | "terraceM2" | "floor" | "orientation" | "price" | "status">[];
};

/** The agency's own registration: it sees its buyer's details (it entered them) and the developer's answer. */
export type AgencyRegistration = {
  id: string;
  developmentId: string;
  developmentName: string;
  buyer: { name: string; phone: string; email: string };
  notes: string;
  status: RegistrationStatus;
  protectedUntil: string | null;
  protectionActive: boolean;
  reason: string;
  createdAt: string;
};

/** Developers whose developments agencies may see: not suspended or cancelled. */
async function activeDeveloperIds(): Promise<string[]> {
  const docs = await collections.agencies
    .find({ accountType: "developer", status: { $nin: ["suspended", "cancelled"] } }, { projection: { _id: 1 } })
    .toArray();
  return docs.map((d) => d._id.toHexString());
}

/** Published (old documents without a visibility are published) and from an active developer. */
const visibleFilter = (developerIds: string[]): Filter<DevProjectDoc> => ({
  developerId: { $in: developerIds },
  $or: [{ visibility: "published" }, { visibility: { $exists: false } }],
});

const descriptionOf = (d: DevProjectDoc) => (typeof d.description === "string" ? { es: d.description, en: "" } : d.description);

function toSummary(d: DevProjectDoc, developerName: string): NewBuildSummary {
  const main = d.images.find((i) => i.id === d.mainImageId) ?? d.images[0] ?? null;
  return {
    id: d._id.toHexString(),
    name: d.name,
    town: d.town,
    province: d.province,
    status: d.status,
    mainImageUrl: main?.url ?? null,
    priceFrom: d.priceFrom,
    priceTo: d.priceTo,
    currency: d.currency,
    bedroomsMin: d.bedroomsMin,
    bedroomsMax: d.bedroomsMax,
    unitsAvailable: d.unitsAvailable,
    unitsTotal: d.unitsTotal,
    collaboration: d.collaboration ?? emptyCollaboration(d.currency),
    expectedCompletion: d.expectedCompletion,
    developerName,
  };
}

/** Every visible development, most recently updated first. `query`: name, town, province or developer contains it. */
export async function listNewBuilds(query = ""): Promise<NewBuildSummary[]> {
  const ids = await activeDeveloperIds();
  if (!ids.length) return [];
  const [docs, developers] = await Promise.all([
    collections.devProjects.find(visibleFilter(ids)).sort({ lastUpdateAt: -1 }).limit(500).toArray(),
    collections.agencies.find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { name: 1 } }).toArray(),
  ]);
  const names = new Map(developers.map((a) => [a._id.toHexString(), a.name]));
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const q = norm(query.trim());
  return docs
    .map((d) => toSummary(d, names.get(d.developerId) ?? ""))
    .filter((d) => !q || norm(`${d.name} ${d.town} ${d.province} ${d.developerName}`).includes(q));
}

/** One visible development with its units, documents and developer; null when it's a draft, gone or its developer is inactive. */
export async function getNewBuild(id: string): Promise<NewBuildDetail | null> {
  if (!ObjectId.isValid(id)) return null;
  const ids = await activeDeveloperIds();
  const doc = await collections.devProjects.findOne({ _id: new ObjectId(id), ...visibleFilter(ids) });
  if (!doc) return null;
  const dev = await collections.agencies.findOne({ _id: new ObjectId(doc.developerId), accountType: "developer" });
  if (!dev) return null;
  const units = await listUnits(doc.developerId, id);
  return {
    ...toSummary(doc, dev.name),
    address: doc.address,
    latitude: doc.latitude,
    longitude: doc.longitude,
    mapsUrl: doc.mapsUrl,
    description: descriptionOf(doc),
    amenities: doc.amenities ?? [],
    images: doc.images.map(({ id, url }) => ({ id, url })),
    documents: (doc.documents ?? []).map(({ id, url, kind, name, size }) => ({ id, url, kind, name, size })),
    protectionDays: doc.protectionDays ?? DEFAULT_PROTECTION_DAYS,
    developer: {
      id: dev._id.toHexString(),
      name: dev.name,
      logo: dev.logo ?? null,
      description: { es: dev.description?.es ?? "", en: dev.description?.en ?? "" },
      website: dev.website ?? "",
      contactPerson: dev.contactPerson ?? "",
      phone: dev.phone ?? "",
      email: dev.contactEmail || "",
      regions: dev.regions ?? [],
    },
    units: units.map(({ id, reference, type, bedrooms, bathrooms, builtM2, plotM2, terraceM2, floor, orientation, price, status }) => ({
      id, reference, type, bedrooms, bathrooms, builtM2, plotM2, terraceM2, floor, orientation, price, status,
    })),
  };
}

/** The agency's own registrations (optionally for one development), newest first. Never another agency's. */
export async function listAgencyRegistrations(agencyId: string, developmentId?: string): Promise<AgencyRegistration[]> {
  const docs = await collections.clientRegistrations
    .find({ agencyId, ...(developmentId ? { developmentId } : {}) }, { projection: { buyerKeys: 0, decidedBy: 0, createdBy: 0 } })
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();
  const now = Date.now();
  return docs.map((d) => ({
    id: d._id.toHexString(),
    developmentId: d.developmentId,
    developmentName: d.developmentName,
    buyer: d.buyer,
    notes: d.notes,
    status: d.status,
    protectedUntil: d.protectedUntil?.toISOString() ?? null,
    protectionActive: d.status === "accepted" && !!d.protectedUntil && d.protectedUntil.getTime() > now,
    reason: d.reason,
    createdAt: d.createdAt.toISOString(),
  }));
}
