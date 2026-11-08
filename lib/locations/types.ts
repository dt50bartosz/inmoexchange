import type { RegionKey } from "@/lib/constants/options";

/** An official municipality (from the national statistics office, INE). */
export type MunicipalityRecord = {
  /** Stable id: "es-<province code>-<INE municipality code>", e.g. "es-03-082". */
  id: string;
  /** INE code, 5 digits (province + municipality), e.g. "03082". */
  ine: string;
  /** Exactly as INE writes it, e.g. "Xàbia/Jávea" or "Alfàs del Pi, l'". */
  officialName: string;
  /** For display: article in front, both official languages, e.g. "Xàbia / Jávea", "L'Alfàs del Pi". */
  name: string;
  /** Other names people search for (Spanish / Valencian forms, common spellings). */
  aliases: string[];
  comarca: string;
  region: RegionKey;
};

export type SubLocationType = "district" | "village" | "urbanisation";

/** A place inside a municipality: district, village or urbanisation (e.g. La Zenia in Orihuela). */
export type SubLocationRecord = {
  id: string;
  name: string;
  aliases: string[];
  type: SubLocationType;
  /** The municipality it belongs to. */
  parentId: string;
  region: RegionKey;
};

export type LocationType = "municipality" | SubLocationType;

/** One searchable location, as the location input and the search use it. */
export type Location = {
  id: string;
  name: string;
  aliases: string[];
  type: LocationType;
  /** Municipality it belongs to (sub-locations only). */
  parentId: string | null;
  /** Display name of that municipality, e.g. "Orihuela" for La Zenia. */
  parentName: string | null;
  province: string;
  region: RegionKey;
  /** INE code (municipalities only). */
  ine: string | null;
};
