import type { MultiLangText } from "@/components/panel/languages";
import type { RegionKey } from "@/components/panel/options";

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

export const PROPERTY_STATUSES = ["active", "draft", "sold"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

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

export type Photo = { id: string; url: string };

export type PropertySource = { kind: "manual" } | { kind: "feed"; feedId: string };

export type Property = {
  id: string;
  reference: string;
  type: PropertyType;
  status: PropertyStatus;
  source: PropertySource;
  /** Feed properties only: hidden from partner agencies and microsites, kept hidden after each sync. */
  hidden: boolean;
  town: string;
  province: string;
  area: RegionKey;
  address: string;
  hideAddress: boolean;
  price: number;
  bedrooms: number;
  bathrooms: number;
  builtM2: number;
  plotM2: number | null;
  description: MultiLangText;
  features: FeatureKey[];
  photos: Photo[];
  /** Visible to partner agencies in the network. */
  shared: boolean;
  commission: string;
  updatedAt: string; // ISO
};

export const FEED_FORMATS = ["kyero", "apinmo"] as const;
export type FeedFormat = (typeof FEED_FORMATS)[number];

export const FEED_FREQUENCIES = ["6h", "12h", "24h"] as const;
export type FeedFrequency = (typeof FEED_FREQUENCIES)[number];

export type FeedStatus = "active" | "paused" | "syncing" | "error";

export type Feed = {
  id: string;
  name: string;
  url: string;
  format: FeedFormat;
  frequency: FeedFrequency;
  status: FeedStatus;
  lastSyncAt: string | null; // ISO
  propertyCount: number;
  lastError: string | null;
};

export const PAGE_SIZE = 10;
export const DESCRIPTION_MAX = 4000;
export const PHOTO_MAX_COUNT = 30;
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
