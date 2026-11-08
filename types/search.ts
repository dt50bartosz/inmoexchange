import type { PropertyCondition, PropertyType } from "@/lib/constants/property";
import type { RegionKey } from "@/lib/constants/options";
import type { Property } from "@/types/property";

/** A property on the network: the same fields as the agency's panel, plus the owning agency. */
/** `own`: the logged-in agency's own property (shown in the search too, without contact buttons). */
export type NetworkProperty = Property & { agencyId: string; own: boolean };

/** The agency behind a network property, as partner agencies see it. */
export type NetworkAgency = {
  id: string;
  name: string;
  logoUrl: string | null;
  town: string;
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  /** Office address on one line ("Calle Mayor 1, 03181 Torrevieja, Alicante"), "" if not set. */
  address: string;
};

export type SearchSort = "newest" | "priceAsc" | "priceDesc";

/** One page of search results. `page` is the page actually shown (a too-high page number is clamped). */
export type SearchResults = {
  /** `distanceFromSearch`: straight-line km from the searched location's centre ("within X km" searches only). */
  items: (NetworkProperty & { distanceFromSearch: number | null })[];
  agencies: NetworkAgency[];
  total: number;
  page: number;
  pageCount: number;
};

/** Filters on the Search page (the same ones an XML export link uses, plus the sort). */
export type SearchFilters = {
  query: string;
  /** Location ids (provinces, municipalities, places inside them), checked against the database; [] = anywhere in Spain. */
  locations: string[];
  /** Also properties within this many km (straight line) of the location's centre; 0 = only the location. */
  radiusKm: number;
  area: "all" | RegionKey;
  type: "all" | PropertyType;
  /** New build or resale (property.condition). */
  condition: "all" | PropertyCondition;
  minPrice: number | null;
  maxPrice: number | null;
  minBeds: number;
  minBaths: number;
  sort: SearchSort;
};
