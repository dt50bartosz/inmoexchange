// lib/db.ts
import "server-only";
import { MongoClient, type Db } from "mongodb";
import type { AgencyDoc, UserDoc } from "../types/models";
import type { ContactDoc } from "../types/crm";
import type { FeedDoc } from "../types/feed";
import type { XmlExportDoc } from "../types/xmlExport";
import type { AgencyApplicationDoc } from "../types/admin";
import type { PropertyEventDoc } from "../types/property-events";
import type { ClientPageDoc } from "../types/client-pages";
import type { ContactMessageDoc } from "../types/contact";
import type { LocationDoc, ProvinceDoc } from "../types/locations";
import type { BlogPostDoc } from "../types/blog";
import type { ActivityDoc, ClientRegistrationDoc, DevProjectDoc, DevUnitDoc, DeveloperContactDoc, DeveloperNoteDoc } from "../types/developers";
import { BLOG_LANGS } from "./constants/blog";

/** One cookie choice (lib/actions/consent.ts): proof of what a visitor agreed to, without IP or account. */
export interface ConsentRecordDoc {
  consentId: string;
  version: string;
  analytics: boolean;
  marketing: boolean;
  action: "accept_all" | "reject_all" | "custom";
  createdAt: Date;
}

const DB_NAME = process.env.MONGODB_DB ?? "inmoexchange";

function resolveUri(): string {
  const raw = process.env.MONGODB_URI?.trim().replace(/^["']|["']$/g, "");

  if (raw && /^mongodb(\+srv)?:\/\//.test(raw)) return raw;

  throw new Error(
    raw
      ? "Invalid MONGODB_URI in .env.local (must start with mongodb:// or mongodb+srv://)"
      : "Missing MONGODB_URI in .env.local"
  );
}

// One client per process, reused across hot reloads and serverless invocations.
// The driver connects lazily on the first query, so no explicit connect() is needed.
const globalForMongo = globalThis as unknown as { _mongoClient?: MongoClient };

const client =
  globalForMongo._mongoClient ??
  new MongoClient(resolveUri());

globalForMongo._mongoClient = client;

export const db: Db = client.db(DB_NAME);

/** All collections in one place. Every panel collection stores agencyId as a string. */
export const collections = {
  agencies: db.collection<AgencyDoc>("agencies"),
  users: db.collection<UserDoc>("users"),
  properties: db.collection("properties"), // TODO: type with PropertyDoc
  crmContacts: db.collection<ContactDoc>("crm_contacts"),
  feeds: db.collection<FeedDoc>("feeds"),
  xmlExports: db.collection<XmlExportDoc>("xml_exports"),
  applications: db.collection<AgencyApplicationDoc>("applications"),
  propertyEvents: db.collection<PropertyEventDoc>("property_events"),
  clientPages: db.collection<ClientPageDoc>("client_pages"),
  contactMessages: db.collection<ContactMessageDoc>("contact_messages"),
  // Imported from INE by lib/server/locations.ts (ids are "es-03", "es-03-133", never ObjectIds)
  locationProvinces: db.collection<ProvinceDoc>("location_provinces"),
  locations: db.collection<LocationDoc>("locations"),
  blogPosts: db.collection<BlogPostDoc>("blog_posts"),
  consentRecords: db.collection<ConsentRecordDoc>("consent_records"),
  // Developer CRM (developers are agencies with accountType "developer"; developerId = agency _id hex)
  devProjects: db.collection<DevProjectDoc>("dev_projects"),
  devUnits: db.collection<DevUnitDoc>("dev_units"),
  clientRegistrations: db.collection<ClientRegistrationDoc>("client_registrations"),
  projectActivity: db.collection<ActivityDoc>("project_activity"),
  developerContacts: db.collection<DeveloperContactDoc>("developer_contacts"),
  developerNotes: db.collection<DeveloperNoteDoc>("developer_notes"),
} as const;

/* ---------- Indexes: all of them here, created once per server process ---------- */

let indexes: Promise<unknown> | null = null;

export function ensureIndexes() {
  indexes ??= Promise.all([
    collections.properties.createIndex({ agencyId: 1, reference: 1 }, { unique: true, name: "agency_reference_unique" }),
    // Platform-wide property code "AA-1234" (lib/server/property-code.ts)
    collections.properties.createIndex({ code: 1 }, { unique: true, name: "code_unique", partialFilterExpression: { code: { $type: "string" } } }),
    collections.crmContacts.createIndex({ agencyId: 1, deletedAt: 1, createdAt: -1 }, { name: "agency_live_newest" }),
    collections.feeds.createIndex({ agencyId: 1, url: 1 }, { unique: true, name: "agency_url_unique" }),
    collections.xmlExports.createIndex({ token: 1 }, { unique: true, name: "token_unique" }),
    collections.xmlExports.createIndex({ agencyId: 1, createdAt: -1 }, { name: "agency_newest" }),
    collections.users.createIndex({ email: 1 }, { unique: true, name: "email_unique" }),
    collections.users.createIndex({ agencyId: 1 }, { name: "agency" }),
    // Only agencies that have a slug: one old document without it must not stop every index from building
    collections.agencies.createIndex(
      { slug: 1 },
      { unique: true, name: "slug_unique", partialFilterExpression: { slug: { $type: "string" } } }
    ),
    // agencyId = _id as a string (set by createAgency), unique like _id
    collections.agencies.createIndex(
      { agencyId: 1 },
      { unique: true, name: "agency_id_unique", partialFilterExpression: { agencyId: { $type: "string" } } }
    ),
    collections.applications.createIndex({ status: 1, createdAt: -1 }, { name: "status_newest" }),
    // Views / clicks: one document per type, property, visitor and day (lib/server/property-events.ts).
    // Partial: documents from before visitorKey existed (scripts/migrate-property-events.mjs fills it in) don't block it.
    collections.propertyEvents.createIndex(
      { type: 1, propertyId: 1, visitorKey: 1, day: 1 },
      { unique: true, name: "one_per_visitor_per_day", partialFilterExpression: { visitorKey: { $type: "string" } } }
    ),
    // The old key (one per *agency*) would refuse a second anonymous visitor on the same day: removed
    collections.propertyEvents.dropIndex("one_per_agency_per_day").catch(() => null),
    collections.propertyEvents.createIndex({ ownerAgencyId: 1, type: 1, lastAt: -1 }, { name: "owner_type_latest" }),
    collections.propertyEvents.createIndex({ propertyId: 1, createdAt: -1 }, { name: "property_newest" }),
    collections.propertyEvents.createIndex({ ownerAgencyId: 1, createdAt: -1 }, { name: "owner_newest" }),
    collections.clientPages.createIndex({ token: 1 }, { unique: true, name: "token_unique" }),
    collections.clientPages.createIndex({ agencyId: 1, updatedAt: -1 }, { name: "agency_latest" }),
    collections.contactMessages.createIndex({ status: 1, createdAt: -1 }, { name: "status_newest" }),
    // Location autocomplete: prefix searches on the normalised keys; exact names map property towns
    collections.locationProvinces.createIndex({ keys: 1 }, { name: "keys" }),
    collections.locations.createIndex({ keys: 1 }, { name: "keys" }),
    collections.locations.createIndex({ names: 1 }, { name: "names" }),
    collections.locations.createIndex({ ine: 1 }, { unique: true, name: "ine_unique", partialFilterExpression: { ine: { $type: "string" } } }),
    // Search by province / town (the ids are set from the property's town text)
    collections.properties.createIndex({ provinceId: 1 }, { name: "province" }),
    // Developments and their units (lib/server/developer/)
    collections.devProjects.createIndex({ developerId: 1, lastUpdateAt: -1 }, { name: "developer_latest" }),
    collections.devProjects.createIndex({ visibility: 1, province: 1 }, { name: "visibility_province" }),
    // "3B" and "3b" are the same unit reference (case-insensitive, accents count)
    collections.devUnits.createIndex(
      { developmentId: 1, reference: 1 },
      { unique: true, name: "development_reference_unique", collation: { locale: "es", strength: 2 } }
    ),
    collections.devUnits.createIndex({ developmentId: 1, status: 1 }, { name: "development_status" }),
    collections.devUnits.createIndex({ developerId: 1 }, { name: "developer" }),
    collections.clientRegistrations.createIndex({ developerId: 1, status: 1, createdAt: -1 }, { name: "developer_status_newest" }),
    collections.clientRegistrations.createIndex({ agencyId: 1, createdAt: -1 }, { name: "agency_newest" }),
    collections.clientRegistrations.createIndex({ developmentId: 1, buyerKeys: 1 }, { name: "development_buyer" }),
    // Future Kyero import: one unit per feed item
    collections.devUnits.createIndex(
      { "source.feedId": 1, "source.externalId": 1 },
      { unique: true, name: "feed_item_unique", partialFilterExpression: { "source.kind": "feed" } }
    ),
    collections.properties.createIndex({ municipalityId: 1 }, { name: "municipality" }),
    // "Within X km of a location" (GeoJSON point set with the coordinates; properties without one are skipped)
    collections.properties.createIndex({ geo: "2dsphere" }, { name: "geo" }),
    // Blog: newest published first; one post per slug in each language
    collections.blogPosts.createIndex({ status: 1, publishedAt: -1 }, { name: "status_newest" }),
    ...BLOG_LANGS.map((lang) =>
      collections.blogPosts.createIndex(
        { [`translations.${lang}.slug`]: 1 },
        { unique: true, name: `slug_${lang}_unique`, partialFilterExpression: { [`translations.${lang}.slug`]: { $type: "string" } } }
      )
    ),
    // Cookie consent records: kept 3 years (the longest limitation period for LOPDGDD infringements), then deleted
    collections.consentRecords.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3 * 365 * 24 * 60 * 60, name: "expire_3y" }),
    collections.consentRecords.createIndex({ consentId: 1, createdAt: -1 }, { name: "consent_latest" }),
    // Developer CRM
    collections.agencies.createIndex({ accountType: 1 }, { name: "account_type", partialFilterExpression: { accountType: { $type: "string" } } }),
    collections.devProjects.createIndex({ developerId: 1, lastUpdateAt: -1 }, { name: "developer_latest" }),
    collections.devProjects.createIndex({ lastUpdateAt: 1 }, { name: "last_update" }),
    collections.projectActivity.createIndex({ projectId: 1, createdAt: -1 }, { name: "project_newest" }),
    collections.projectActivity.createIndex({ developerId: 1, createdAt: -1 }, { name: "developer_newest" }),
    collections.developerContacts.createIndex({ developerId: 1, createdAt: 1 }, { name: "developer" }),
    collections.developerNotes.createIndex({ developerId: 1, createdAt: -1 }, { name: "developer_newest" }),
    // Property inventory of a project
    collections.properties.createIndex({ projectId: 1 }, { name: "project", partialFilterExpression: { projectId: { $type: "string" } } }),
    // Rate limit windows (lib/server/rate-limit.ts) delete themselves once expired
    db.collection("rateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expire" }),
  ]).catch((err) => {
    indexes = null; // retry on the next request
    throw err;
  });
  return indexes;
}

/** Async alias kept for older code that calls `await getDb()`. */
export async function getDb(): Promise<Db> {
  return db;
}
