/* Developer CRM: developers are agency accounts with accountType "developer". Shared by browser and server. */

export const ACCOUNT_TYPES = ["agency", "developer"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * The CRM status, worked out from the account (never stored):
 * inactive = suspended or cancelled, pending = has never logged in, active = otherwise.
 */
export const DEVELOPER_STATUSES = ["active", "pending", "inactive"] as const;
export type DeveloperStatus = (typeof DEVELOPER_STATUSES)[number];

/** Construction stage: en proyecto / en construcción / terminada. */
export const PROJECT_STATUSES = ["planning", "construction", "completed"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  construction: "Under construction",
  completed: "Completed",
};

/** Whether agencies see the development. Separate from the construction stage. New developments start as drafts. */
export const DEVELOPMENT_VISIBILITIES = ["draft", "published"] as const;
export type DevelopmentVisibility = (typeof DEVELOPMENT_VISIBILITIES)[number];

export const AMENITIES = [
  "pool",
  "indoorPool",
  "garden",
  "gym",
  "spa",
  "parking",
  "storage",
  "lift",
  "solarium",
  "playground",
  "padel",
  "gatedCommunity",
  "concierge",
  "coworking",
  "evCharging",
  "seaViews",
  "nearBeach",
  "nearGolf",
] as const;
export type Amenity = (typeof AMENITIES)[number];

/** PDF documents of a development (R2). */
export const DOCUMENT_KINDS = ["brochure", "priceList", "plans", "qualities", "other"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export const DOCUMENTS_MAX = 20;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

/**
 * Collaboration terms for agencies: set freely by the developer, per development.
 * The platform never fills in or suggests a value.
 */
export const COLLABORATION_TYPES = ["percent", "fixed"] as const;
export type CollaborationType = (typeof COLLABORATION_TYPES)[number];

/** Days an accepted client registration protects the agency, unless the developer sets another number. */
export const DEFAULT_PROTECTION_DAYS = 90;

/** Units inside a development (collection "dev_units"). */
export const UNIT_STATUSES = ["available", "reserved", "sold"] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];
export const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];
export const UNITS_MAX = 1000;
/** Most units changed by one bulk edit. */
export const BULK_UNITS_MAX = 500;

/**
 * An agency registers a buyer for a development; the developer accepts or rejects it.
 * An accepted one protects that agency for the buyer until protectedUntil (the development's protectionDays).
 */
export const REGISTRATION_STATUSES = ["pending", "accepted", "rejected"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
/** Why a registration was rejected without the developer deciding. */
export const AUTO_REJECT_REASONS = ["protected_other"] as const;

export const CURRENCIES = ["EUR", "GBP", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PROJECT_IMAGES_MAX = 30;

/** Who made a change. "api_import" = an XML feed sync. */
export const ACTIVITY_SOURCES = ["developer", "admin", "api_import", "system"] as const;
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

export const ACTIVITY_SOURCE_LABELS: Record<ActivitySource, string> = {
  developer: "Developer",
  admin: "Admin",
  api_import: "API import",
  system: "System",
};

export const ACTIVITY_TYPES = [
  "project_created",
  "details_changed",
  "price_changed",
  "status_changed",
  "availability_changed",
  "images_changed",
  "property_added",
  "property_removed",
  "property_changed",
  "project_deleted",
  "published",
  "unpublished",
  "documents_changed",
  "collaboration_changed",
  "unit_added",
  "unit_changed",
  "unit_removed",
  "note",
  "login",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  project_created: "Project created",
  details_changed: "Details changed",
  price_changed: "Price changed",
  status_changed: "Status changed",
  availability_changed: "Availability changed",
  images_changed: "Images changed",
  property_added: "Property added",
  property_removed: "Property removed",
  property_changed: "Property changed",
  project_deleted: "Project deleted",
  published: "Published to agencies",
  unpublished: "Back to draft",
  documents_changed: "Documents changed",
  collaboration_changed: "Collaboration terms changed",
  unit_added: "Unit added",
  unit_changed: "Unit changed",
  unit_removed: "Unit removed",
  note: "Manual update",
  login: "Logged in",
};

/** Activity that counts as "the project was updated" (logins and admin notes don't). */
export const UPDATE_ACTIVITY_TYPES: ActivityType[] = ACTIVITY_TYPES.filter((t) => t !== "login" && t !== "note");

/** Days without an update before a project or developer turns orange, then red. */
export const STALE_DAYS = { warning: 30, danger: 90 } as const;

/** "Not updated for" filter in the CRM tables. */
export const STALENESS_FILTERS = [30, 60, 90] as const;

export type Freshness = "fresh" | "warning" | "danger" | "never";

export function freshness(days: number | null): Freshness {
  if (days === null) return "never";
  if (days >= STALE_DAYS.danger) return "danger";
  if (days >= STALE_DAYS.warning) return "warning";
  return "fresh";
}
