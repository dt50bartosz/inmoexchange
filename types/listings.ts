import type { Property } from "@/types/property";

/**
 * A property on the public /listings pages (no login). Only the property itself:
 * never the agency, its contact details, its own reference, the commission or the address.
 * Identified by its platform code ("KT-4821").
 */
export type PublicListing = Pick<
  Property,
  | "code"
  | "type"
  | "condition"
  | "town"
  | "province"
  | "area"
  | "price"
  | "bedrooms"
  | "bathrooms"
  | "builtM2"
  | "plotM2"
  | "yearBuilt"
  | "energyRating"
  | "features"
  | "description"
> & {
  photos: { url: string }[];
  createdAt: string; // ISO
};

/** One page of public listings. `page` is the page actually shown. */
export type ListingResults = {
  /** `distanceFromSearch`: straight-line km from the searched location's centre ("within X km" searches only). */
  items: (PublicListing & { distanceFromSearch: number | null })[];
  total: number;
  page: number;
  pageCount: number;
};
