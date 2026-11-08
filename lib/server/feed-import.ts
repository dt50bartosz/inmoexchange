// lib/server/feed-import.ts
// Imports a Kyero feed into the agency's properties: creates new ones, updates existing ones,
// deletes the ones that left the feed. Used by "Sync now", by adding a feed, and later by the daily cron.
import "server-only";
import { MongoBulkWriteError, ObjectId, type AnyBulkWriteOperation, type Document } from "mongodb";
import { collections, ensureIndexes } from "@/lib/db";
import { uniquePropertyCodes } from "@/lib/server/property-code";
import { createCoordinatesResolver, createPlaceResolver } from "@/lib/server/locations";
import { resolveLocation } from "@/lib/locations";
import { propertySchema } from "@/lib/schemas/property";
import { DESCRIPTION_MAX, type FeatureKey, type PropertyType } from "@/lib/constants/property";
import type { RegionKey } from "@/lib/constants/options";
import type { FeedDoc } from "@/types/feed";
import { feedPropertiesFilter } from "./feeds";
import { checkKyeroFeed, type KyeroProperty } from "./kyero";

export type ImportSummary = { created: number; updated: number; deleted: number; skipped: number };

export type ImportResult =
  | ({ ok: true } & ImportSummary)
  | { ok: false; reason: "unreachable" | "not_kyero" | "blocked" | "too_large" | "import_failed" };

/** Lowercase, no accents, single spaces: "Jávea " → "javea". */
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/* ---------- Mapping: Kyero → your property ---------- */

const TYPE_MAP: Record<string, PropertyType> = {
  apartment: "apartment",
  flat: "apartment",
  studio: "apartment",
  penthouse: "penthouse",
  "ground floor": "groundFloor",
  "ground floor apartment": "groundFloor",
  "town house": "townhouse",
  townhouse: "townhouse",
  "terraced house": "townhouse",
  "semi-detached": "townhouse",
  "semi detached": "townhouse",
  "semi-detached house": "townhouse",
  duplex: "townhouse",
  quad: "townhouse",
  "quad house": "townhouse",
  bungalow: "bungalow",
  villa: "villa",
  "detached villa": "villa",
  "detached house": "villa",
  house: "villa",
  chalet: "villa",
  finca: "villa",
  "country house": "villa",
  cortijo: "villa",
  plot: "plot",
  land: "plot",
  commercial: "commercial",
  "commercial property": "commercial",
  business: "commercial",
  shop: "commercial",
  office: "commercial",
};

/** Exact match first, then the closest word ("luxury villa" → villa). Unknown → null (skipped). */
function mapType(kyeroType: string): PropertyType | null {
  const t = norm(kyeroType);
  if (TYPE_MAP[t]) return TYPE_MAP[t];
  if (t.includes("penthouse")) return "penthouse";
  if (t.includes("ground floor")) return "groundFloor";
  if (t.includes("apartment") || t.includes("flat")) return "apartment";
  if (t.includes("town") || t.includes("duplex") || t.includes("quad") || t.includes("semi")) return "townhouse";
  if (t.includes("bungalow")) return "bungalow";
  if (t.includes("villa") || t.includes("finca") || t.includes("country") || t.includes("chalet")) return "villa";
  if (t.includes("plot") || t.includes("land")) return "plot";
  if (t.includes("commercial") || t.includes("shop") || t.includes("office")) return "commercial";
  return null;
}

// Keys are Kyero feature names in lowercase, letters only ("swimmingPool" → "swimmingpool")
const FEATURE_MAP: Record<string, FeatureKey> = {
  swimmingpool: "pool",
  pool: "pool",
  communalpool: "pool",
  privatepool: "privatePool",
  garage: "garage",
  parking: "parking",
  privateparking: "parking",
  seaview: "seaView",
  seaviews: "seaView",
  heatingac: "ac",
  airconditioning: "ac",
  aircon: "ac",
  ac: "ac",
  terrace: "terrace",
  garden: "garden",
  privategarden: "garden",
  elevator: "lift",
  lift: "lift",
  furnished: "furnished",
  storage: "storage",
  storageroom: "storage",
  solarium: "solarium",
};

function mapFeatures(features: string[]): FeatureKey[] {
  const out = new Set<FeatureKey>();
  for (const f of features) {
    const key = FEATURE_MAP[f.toLowerCase().replace(/[^a-z]/g, "")];
    if (key) out.add(key);
  }
  return [...out];
}

const NORTH_ALICANTE = [
  "benidorm", "altea", "calpe", "calp", "javea", "xabia", "denia", "moraira", "teulada", "benissa",
  "villajoyosa", "la vila joiosa", "finestrat", "alfaz del pi", "l'alfas del pi", "albir", "polop",
  "la nucia", "jalon", "xalo", "orba", "pego", "gata de gorgos", "benitachell", "el poble nou de benitatxell",
  "el campello", "busot", "relleu", "sella", "guadalest", "callosa d'en sarria", "parcent", "alcalali",
  "els poblets", "ondara", "pedreguer", "lliber", "senija",
];

const COASTAL_MURCIA = [
  "san pedro del pinatar", "lo pagan", "san javier", "santiago de la ribera", "los alcazares", "la manga",
  "la manga del mar menor", "cartagena", "cabo de palos", "playa honda", "mar de cristal", "los urrutias",
  "los nietos", "mazarron", "puerto de mazarron", "bolnuevo", "isla plana", "camposol", "aguilas",
];

/** Region from province + town. Unknown province → null (skipped). */
function mapArea(province: string, town: string): RegionKey | null {
  const p = norm(province);
  const t = norm(town);

  // Every Alicante municipality, district and urbanisation is in lib/locations, with its region
  const known = resolveLocation(town);
  if (known && (p.includes("alicante") || p.includes("alacant") || p.includes("costa blanca") || !p)) return known.region;
  if (p.includes("alicante") || p.includes("alacant") || p.includes("costa blanca")) {
    return NORTH_ALICANTE.some((n) => t === n || t.startsWith(`${n} `)) ? "costaBlancaNorth" : "costaBlancaSouth";
  }
  if (p.includes("murcia") || p.includes("costa calida")) {
    return COASTAL_MURCIA.some((n) => t === n || t.startsWith(`${n} `)) ? "costaCalida" : "inlandMurcia";
  }
  if (p.includes("malaga") || p.includes("costa del sol")) return "costaDelSol";
  if (p.includes("almeria")) return "costaAlmeria";
  return null;
}

/** One Kyero property → validated property fields, or null if it can't be imported. */
export function mapKyeroProperty(k: KyeroProperty) {
  if (k.priceFreq !== "sale") return null; // rentals are skipped

  const type = mapType(k.type);
  const area = mapArea(k.province, k.town);
  if (!type || !area) return null;

  const cut = (s?: string) => (s ?? "").slice(0, DESCRIPTION_MAX);
  // Plots usually have no built area: use the plot size instead
  const builtM2 = k.built && k.built > 0 ? k.built : type === "plot" ? (k.plot ?? 0) : 0;

  const parsed = propertySchema.safeParse({
    type,
    condition: k.newBuild ? "newBuild" : "resale",
    reference: k.ref || k.id,
    town: k.town,
    province: k.province,
    area,
    address: "",
    hideAddress: true,
    latitude: k.latitude,
    longitude: k.longitude,
    coordinatesSource: k.latitude !== null ? "feed" : null,
    price: Math.round(k.price ?? 0),
    bedrooms: Math.round(k.beds ?? 0),
    bathrooms: Math.round(k.baths ?? 0),
    builtM2,
    plotM2: k.plot && k.plot > 0 ? k.plot : null,
    yearBuilt: null,
    energyRating: null,
    communityFees: null,
    features: mapFeatures(k.features),
    photos: [], // feed photos are added below: they are links and have no limit
    description: { en: cut(k.desc.en), es: cut(k.desc.es), pl: cut(k.desc.pl) },
    status: "active",
    shared: true,
    commission: "N/A",
  });
  if (!parsed.success) return null;

  const photos = k.images
    .filter((url) => url.length <= 2000)
    .map((url, i) => ({ id: `feed-${k.id}-${i}`, url, key: null }));

  return { ...parsed.data, photos };
}

/* ---------- Saving ---------- */

/** Fields the agency controls on feed properties; a re-sync never overwrites them. */
const AGENCY_SETTINGS = new Set(["shared", "commission", "status"]);

/**
 * Imports one feed. Pass `properties` when the feed was just downloaded (e.g. right after adding it)
 * to avoid downloading it twice. Never throws: problems are saved on the feed and returned.
 */
export async function importFeed(feed: FeedDoc, properties?: KyeroProperty[]): Promise<ImportResult> {
  const feeds = collections.feeds;
  const props = collections.properties;
  const feedId = feed._id.toHexString();
  const now = new Date();

  await feeds.updateOne({ _id: feed._id }, { $set: { status: "syncing", updatedAt: now } });

  const fail = async (reason: Extract<ImportResult, { ok: false }>["reason"]): Promise<ImportResult> => {
    await feeds.updateOne({ _id: feed._id }, { $set: { status: "error", lastError: reason, updatedAt: new Date() } });
    return { ok: false, reason };
  };

  try {
    let items = properties;
    if (!items) {
      const check = await checkKyeroFeed(feed.url);
      if (!check.ok) return await fail(check.reason);
      items = check.properties;
    }

    await ensureIndexes();
    const fromFeed = feedPropertiesFilter(feed.agencyId, feedId);

    // What this feed imported before, by Kyero id
    const existing = await props
      .find(fromFeed, { projection: { _id: 1, price: 1, "source.externalId": 1 } })
      .toArray();
    const byExternalId = new Map(existing.map((d) => [String(d.source?.externalId), d]));

    // References used by the agency's other properties (manual or other feeds): those win
    const takenRefs = new Set(
      (await props.find({ agencyId: feed.agencyId, $nor: [fromFeed] }, { projection: { reference: 1 } }).toArray()).map(
        (d) => String(d.reference)
      )
    );

    const ops: AnyBulkWriteOperation<Document>[] = [];
    // Developer CRM: price changes and removals of properties that belong to a project (written after the import)
    // Province / town ids for the search, from each property's town text (same towns are looked up once)
    const placeOf = await createPlaceResolver();
    const coordinatesOf = await createCoordinatesResolver();
    const seenIds = new Set<string>();
    const seenRefs = new Set<string>();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const k of items) {
      if (k.priceFreq !== "sale") continue; // rentals don't count as skipped
      const values = k.id ? mapKyeroProperty(k) : null;
      if (!values || seenIds.has(k.id) || takenRefs.has(values.reference) || seenRefs.has(values.reference)) {
        skipped++;
        continue;
      }
      seenIds.add(k.id);
      seenRefs.add(values.reference);
      const place = await placeOf(values.town, values.province);
      // The feed's own point, else the town centre; distance from the town centre (no geocoder calls here)
      const coordinates = await coordinatesOf(place.locationId, values.latitude, values.longitude, values.coordinatesSource);

      const old = byExternalId.get(k.id);
      if (old) {
        // Update the feed data; keep the agency's own settings (shared, commission, hidden, status)
        const feedData = Object.fromEntries(Object.entries(values).filter(([key]) => !AGENCY_SETTINGS.has(key)));
        const update: Document = { $set: { ...feedData, ...place, ...coordinates, updatedAt: now } };
        // A new price moves the old one into the price history, like a manual edit
        if (old.price !== values.price) {
          update.$push = { priceHistory: { price: old.price, date: now.toISOString() } };
        }
        ops.push({ updateOne: { filter: { _id: old._id }, update } });
        updated++;
      } else {
        ops.push({
          insertOne: {
            document: {
              _id: new ObjectId(),
              agencyId: feed.agencyId,
              ...values,
              ...place,
              ...coordinates,
              source: { kind: "feed", feedId, externalId: k.id },
              hidden: false,
              priceHistory: [],
              createdAt: now,
              updatedAt: now,
            },
          },
        });
        created++;
      }
    }

    // New properties get their platform codes "AA-1234" (checked free in one go)
    const inserts = ops.flatMap((op) => ("insertOne" in op && op.insertOne ? [op.insertOne.document] : []));
    if (inserts.length) {
      const codes = await uniquePropertyCodes(inserts.length);
      inserts.forEach((doc, i) => (doc.code = codes[i]));
    }

    // Write everything in one go; a clash with the unique reference index only skips that property
    if (ops.length) {
      try {
        await props.bulkWrite(ops, { ordered: false });
      } catch (error) {
        if (!(error instanceof MongoBulkWriteError)) throw error;
        const failed = Array.isArray(error.writeErrors) ? error.writeErrors.length : 1;
        skipped += failed;
        created = Math.max(0, created - failed);
      }
    }

    // Properties that left the feed are deleted
    const gone = existing.filter((d) => !seenIds.has(String(d.source?.externalId))).map((d) => d._id);
    if (gone.length) await props.deleteMany({ _id: { $in: gone } });

    const propertyCount = await props.countDocuments(fromFeed);
    await feeds.updateOne(
      { _id: feed._id },
      { $set: { status: "active", propertyCount, lastSyncAt: new Date(), lastError: null, updatedAt: new Date() } }
    );

    return { ok: true, created, updated, deleted: gone.length, skipped };
  } catch (error) {
    console.error("importFeed failed", feedId, error);
    return await fail("import_failed");
  }
}