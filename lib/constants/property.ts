export const PROPERTY_TYPES = [
  "apartment",
  "penthouse",
  "groundFloor",
  "townhouse",
  "bungalow",
  "villa",
  "plot",
  "commercial",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_STATUSES = ["active", "sold"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const PROPERTY_CONDITIONS = ["newBuild", "resale"] as const;
export type PropertyCondition = (typeof PROPERTY_CONDITIONS)[number];

/** Spanish energy certificate. "inProgress" = en trámite. */
export const ENERGY_RATINGS = ["A", "B", "C", "D", "E", "F", "G", "inProgress"] as const;
export type EnergyRating = (typeof ENERGY_RATINGS)[number];

export const FEATURE_KEYS = [
  "pool",
  "privatePool",
  "garage",
  "parking",
  "seaView",
  "ac",
  "terrace",
  "garden",
  "lift",
  "furnished",
  "storage",
  "solarium",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const DESCRIPTION_MAX = 4000;
export const PHOTO_MAX_COUNT = 30;
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const YEAR_BUILT_MIN = 1800;
