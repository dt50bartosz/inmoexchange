import type { ObjectId } from "mongodb";
import type { z } from "zod";
import type { RegionKey } from "@/lib/constants/options";
import type { PropertyType } from "@/lib/constants/property";
import type {
  ActivitySource,
  ActivityType,
  Amenity,
  CollaborationType,
  Currency,
  DeveloperStatus,
  DevelopmentVisibility,
  DocumentKind,
  Freshness,
  Orientation,
  ProjectStatus,
  RegistrationStatus,
  UnitStatus,
} from "@/lib/constants/developers";
import type {
  developerContactSchema,
  developerNoteSchema,
  developerProfileSchema,
  newDeveloperSchema,
} from "@/lib/schemas/developers";
import type { developmentSchema } from "@/lib/schemas/developments";
import type { bulkUnitsSchema, unitSchema } from "@/lib/schemas/units";

/*
 * Developer CRM. A developer is an agency account (collection "agencies") with accountType "developer",
 * so it keeps the same login, panel and status. `developerId` everywhere = that agency's _id as a string.
 */

export type StoredImage = { id: string; url: string; key: string; width?: number; height?: number };

/** A PDF of a development on R2 (brochure, price list, plans, memoria de calidades). id = key once saved. */
export type StoredDocument = { id: string; key: string; url: string; kind: DocumentKind; name: string; size: number };

/** The developer's terms for agencies. value null = not set yet (a development can't be published without it). */
export type Collaboration = {
  type: CollaborationType;
  value: number | null;
  currency: Currency;
  paymentTerms: string;
  notes: string;
};

/** Who created / last changed a development or unit: the developer itself or an admin on its behalf. */
export type AuditStamp = { role: "developer" | "admin" | "system"; userId: string | null };

/** A development project (collection "dev_projects"). Its units are in "dev_units". */
export interface DevProjectDoc {
  _id: ObjectId;
  developerId: string;
  name: string;
  address: string;
  town: string;
  province: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string;
  /** es / en. Documents saved before descriptions were bilingual hold a plain string (read as Spanish). */
  description: { es: string; en: string } | string;
  amenities?: Amenity[];
  images: StoredImage[];
  mainImageId: string | null;
  documents?: StoredDocument[];
  collaboration?: Collaboration;
  protectionDays?: number;
  /** Missing on documents saved before drafts existed = published. */
  visibility?: DevelopmentVisibility;
  publishedAt?: Date | null;
  createdBy?: AuditStamp;
  updatedBy?: AuditStamp;
  /** Where it came from; "feed" is reserved for a future Kyero import of new builds. */
  source?: { kind: "manual" } | { kind: "feed"; feedId: string; externalId: string };
  /**
   * "units": the price range, bedrooms, property types and unit counts below are worked out from the development's units
   * (lib/server/developer/units.ts) and the form can't change them. Missing / "manual": typed in the form.
   */
  summarySource?: "manual" | "units";
  /** Number of properties (units) in the development, as declared; linked listings are counted separately. */
  unitsTotal: number | null;
  unitsAvailable: number | null;
  propertyTypes: PropertyType[];
  priceFrom: number | null;
  priceTo: number | null;
  currency: Currency;
  bedroomsMin: number | null;
  bedroomsMax: number | null;
  status: ProjectStatus;
  /** Calendar dates "2027-06-30" or "". */
  expectedCompletion: string;
  actualCompletion: string;
  createdAt: Date;
  updatedAt: Date;
  /** Time of the last tracked change (any activity except logins and notes). */
  lastUpdateAt: Date;
}

/** Who did something. userId/email are null for feed imports and the system. */
export type Actor = { userId: string | null; email: string | null; role: "agency" | "developer" | "admin" | "system" };

/**
 * One entry in the permanent update history (collection "project_activity").
 * Never edited or deleted, also not when the project or developer is deleted (names are copied in).
 */
export interface ActivityDoc {
  _id: ObjectId;
  developerId: string;
  developerName: string;
  /** null = about the developer, not a project (e.g. a login). */
  projectId: string | null;
  projectName: string | null;
  propertyId: string | null;
  type: ActivityType;
  source: ActivitySource;
  actor: Actor;
  /** The field that changed, e.g. "priceFrom". */
  field: string | null;
  description: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

/** Extra contacts at a developer (collection "developer_contacts"). The main contact is on the agency. */
export interface DeveloperContactDoc {
  _id: ObjectId;
  developerId: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Internal admin note (collection "developer_notes"); developers never see these. */
export interface DeveloperNoteDoc {
  _id: ObjectId;
  developerId: string;
  projectId: string | null;
  body: string;
  author: { userId: string; email: string };
  createdAt: Date;
  updatedAt: Date;
}

/* ---------- What the browser receives (dates as ISO strings) ---------- */

export type Project = {
  id: string;
  developerId: string;
  name: string;
  address: string;
  town: string;
  province: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string;
  description: { es: string; en: string };
  amenities: Amenity[];
  images: StoredImage[];
  mainImageId: string | null;
  documents: StoredDocument[];
  collaboration: Collaboration;
  protectionDays: number;
  visibility: DevelopmentVisibility;
  publishedAt: string | null;
  createdBy: AuditStamp | null;
  updatedBy: AuditStamp | null;
  summarySource: "manual" | "units";
  /** The main image's URL (or the first image's), null without images. */
  mainImageUrl: string | null;
  unitsTotal: number | null;
  unitsAvailable: number | null;
  propertyTypes: PropertyType[];
  priceFrom: number | null;
  priceTo: number | null;
  currency: Currency;
  bedroomsMin: number | null;
  bedroomsMax: number | null;
  status: ProjectStatus;
  expectedCompletion: string;
  actualCompletion: string;
  createdAt: string;
  updatedAt: string;
  lastUpdateAt: string;
  /** Whole days since lastUpdateAt, worked out on the server. */
  daysSinceUpdate: number;
  freshness: Freshness;
};

/** A project row in the CRM tables, with its developer's name. */
export type ProjectRow = Project & { developerName: string };

export type Activity = {
  id: string;
  developerId: string;
  developerName: string;
  projectId: string | null;
  projectName: string | null;
  propertyId: string | null;
  type: ActivityType;
  source: ActivitySource;
  actor: Actor;
  field: string | null;
  description: string;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
};

export type DeveloperContact = {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
};

export type DeveloperNote = {
  id: string;
  projectId: string | null;
  body: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
};

/** A developer as the CRM shows it. */
export type Developer = {
  id: string;
  name: string;
  legalName: string;
  logo: string | null;
  cif: string;
  country: string;
  town: string;
  street: string;
  postcode: string;
  province: string;
  website: string;
  /** Login email. */
  email: string;
  contactEmail: string;
  phone: string;
  contactPerson: string;
  contactPosition: string;
  regions: RegionKey[];
  description: { es: string; en: string };
  status: DeveloperStatus;
  /** The account's platform status (CRM "inactive" = suspended or cancelled). */
  accountStatus: "trial" | "active" | "suspended" | "cancelled";
  createdAt: string;
  lastLoginAt: string | null;
  /** Last tracked activity of any kind (login included). */
  lastActivityAt: string | null;
  /** Latest lastUpdateAt of the developer's projects. */
  lastProjectUpdateAt: string | null;
  daysSinceProjectUpdate: number | null;
  daysSinceActivity: number | null;
  freshness: Freshness;
  relationshipManager: { id: string; email: string } | null;
  projectCount: number;
  propertyCount: number;
};

/** A CRM table row: the developer plus a short list of its projects (for the expanded row and search). */
export type DeveloperRow = Developer & {
  projects: Pick<ProjectRow, "id" | "name" | "town" | "province" | "status" | "lastUpdateAt" | "daysSinceUpdate" | "freshness">[];
};

export type DeveloperCrmStats = {
  developers: number;
  active: number;
  projects: number;
  underConstruction: number;
  completed: number;
  /** Projects updated in the last 30 days. */
  recentlyUpdated: number;
  /** Developers without any activity for 30+ days (or never). */
  noRecentActivity: number;
  /** Projects not updated for 30+, 60+, 90+ days. */
  stale: { 30: number; 60: number; 90: number };
};

export type AdminOption = { id: string; email: string };

export type DeveloperProfileValues = z.input<typeof developerProfileSchema>;
export type NewDeveloperValues = z.input<typeof newDeveloperSchema>;
export type ProjectValues = z.input<typeof developmentSchema>;
export type UnitValues = z.input<typeof unitSchema>;
export type BulkUnitsValues = z.input<typeof bulkUnitsSchema>;

/** One unit (home) inside a development (collection "dev_units"). Belongs to the development's developer. */
export interface DevUnitDoc {
  _id: ObjectId;
  developerId: string;
  developmentId: string;
  reference: string;
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  builtM2: number | null;
  plotM2: number | null;
  terraceM2: number | null;
  floor: string;
  orientation: Orientation | "";
  price: number | null;
  status: UnitStatus;
  /** Reserved for a future Kyero import of new builds (externalId = the feed's own id). */
  source: { kind: "manual" } | { kind: "feed"; feedId: string; externalId: string };
  createdBy: AuditStamp;
  updatedBy: AuditStamp;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * An agency's client registration for a development (collection "client_registrations").
 * Names are copied in so the list still reads after renames. The buyer's phone / email are for the agency and for
 * spotting the same buyer again (buyerKeys); they are never sent to the developer.
 */
export interface ClientRegistrationDoc {
  _id: ObjectId;
  developerId: string;
  developmentId: string;
  developmentName: string;
  agencyId: string;
  agencyName: string;
  buyer: { name: string; phone: string; email: string };
  /** Normalised "p:34600111222" / "e:ana@mail.com": how the same buyer is recognised. */
  buyerKeys: string[];
  notes: string;
  status: RegistrationStatus;
  /** Set when accepted: the agency is protected for this buyer until then. */
  protectedUntil: Date | null;
  /** Developer's reason, or "protected_other" when another agency's registration was accepted for the same buyer. */
  reason: string;
  createdBy: { userId: string };
  decidedBy: AuditStamp | null;
  createdAt: Date;
  decidedAt: Date | null;
}

/** A registration as the developer sees it: no buyer contact details. */
export type DeveloperRegistration = {
  id: string;
  developmentId: string;
  developmentName: string;
  agencyName: string;
  buyerName: string;
  notes: string;
  status: RegistrationStatus;
  protectedUntil: string | null;
  /** Accepted and protectedUntil still in the future. */
  protectionActive: boolean;
  reason: string;
  createdAt: string;
  decidedAt: string | null;
};

/** A unit as the browser gets it. */
export type Unit = Omit<DevUnitDoc, "_id" | "createdAt" | "updatedAt"> & { id: string; createdAt: string; updatedAt: string };
export type DeveloperContactValues = z.input<typeof developerContactSchema>;
export type DeveloperNoteValues = z.input<typeof developerNoteSchema>;

