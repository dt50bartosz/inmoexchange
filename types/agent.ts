import type { LangCode, MultiLangText } from "@/components/panel/languages";
import type { RegionKey, SpokenLanguageKey } from "@/components/panel/options";

export type Agency = {
  // Shown to partners and clients
  name: string;
  logoUrl: string | null;
  // Client microsite About page, per language
  about: MultiLangText;
  defaultLanguage: LangCode;
  // Contact
  contactPerson: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  // Address
  street: string;
  town: string;
  province: string;
  postcode: string;
  // Areas
  regions: RegionKey[];
  spokenLanguages: SpokenLanguageKey[];
  // Partners only
  legalName: string;
  cif: string;
  founded: string;
  commission: string;
  // Social
  facebook: string;
  instagram: string;
  linkedin: string;
};

/** Typed setter for a single Agency field. */
export type SetField = <K extends keyof Agency>(key: K, value: Agency[K]) => void;

export type ToastMsg = { kind: "ok" | "error"; text: string };

export const ABOUT_MAX = 1500;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;