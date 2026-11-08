import type { ObjectId } from "mongodb";
import type { z } from "zod";
import type { RegionKey } from "@/lib/constants/options";
import type { AgencyStatus, ApplicationStatus } from "@/lib/constants/admin";
import type { AccountType } from "@/lib/constants/developers";
import type { ActiveDevelopments } from "@/lib/schemas/developer-application";
import type { addAgencySchema, hidePropertySchema, rejectApplicationSchema } from "@/lib/schemas/admin";
import type { Feed } from "@/lib/schemas/feed";
import type { Property } from "@/lib/schemas/property";

/** An agency as the platform admin sees it. */
export type AdminAgency = {
  id: string;
  name: string;
  legalName: string;
  cif: string;
  contactPerson: string;
  email: string;
  phone: string;
  town: string;
  regions: RegionKey[];
  status: AgencyStatus;
  createdAt: string; // ISO
  lastLoginAt: string | null; // ISO
  /** Set when the agency was created and the invite email hasn't been used yet. */
  invitePending: boolean;
  /** Register form details (agencies that joined through /join); IBAN masked. */
  registration: {
    preferredLanguage: string;
    raicv: string;
    website: string;
    address: string;
    ownerName: string;
    ownerIdNumber: string;
    phone2: string;
    email2: string;
    crm: string;
    crmAgencyNumber: string;
    paymentFrequency: string;
    iban: string;
    privacyAcceptedAt: string | null;
  };
};

/** A "Join as an agency" request from the landing page. */
export type AgencyApplication = {
  id: string;
  agencyName: string;
  legalName: string;
  cif: string;
  contactPerson: string;
  email: string;
  phone: string;
  town: string;
  regions: RegionKey[];
  feedUrl: string;
  /** Free text from the old form (before regions); "" on new applications. */
  areas: string;
  /** Register form details; null on applications from the old form. IBAN masked ("ES91 •••• 1332"). */
  registration: (Omit<RegistrationDetails, "privacyAcceptedAt"> & { privacyAcceptedAt: string }) | null;
  /** Developer applications (/promotoras): "1", "2-5", "6-10", "10+"; null for agencies. */
  activeDevelopments: ActiveDevelopments | null;
  /** Developer applications: their message ("" when none). */
  message: string;
  createdAt: string; // ISO
  status: ApplicationStatus;
  decidedAt: string | null;
  rejectReason: string | null;
  /** The agency created when the application was approved. */
  agencyId: string | null;
};

/** An import feed together with the agency it belongs to. */
export type AdminFeed = Feed & { agencyId: string };

/** A property hidden from the network by the admin (not by the agency). */
export type Moderation = { reason: string; at: string }; // at: ISO

/** A property as the admin sees it: the same fields as the agency's panel, plus owner and moderation. */
export type AdminProperty = Property & { agencyId: string; moderation: Moderation | null };

export type AddAgencyValues = z.input<typeof addAgencySchema>;
export type RejectApplicationValues = z.input<typeof rejectApplicationSchema>;
export type HidePropertyValues = z.input<typeof hidePropertySchema>;

/** An application as stored in MongoDB (collection "applications"). The admin pages use `AgencyApplication`. */
/** Registration details from the /join register form, kept on the application and copied to the agency. */
export type RegistrationDetails = {
  preferredLanguage: "en" | "es";
  /** "developer" = registered as a property developer. Missing on older applications = agency. */
  accountType?: AccountType;
  brandName: string;
  /** Registro de Agentes de Intermediación Inmobiliaria (Comunitat Valenciana) number */
  raicv: string;
  website: string;
  street: string;
  province: string;
  postcode: string;
  ownerName: string;
  /** DNI / NIE / passport number of the CEO or owner */
  ownerIdNumber: string;
  phone2: string;
  email2: string;
  crm: string;
  crmAgencyNumber: string;
  paymentFrequency: "" | "monthly" | "quarterly" | "yearly";
  /** Normalised (no spaces, upper case). Never sent to the browser in full. */
  iban: string;
  privacyAcceptedAt: Date;
};

export interface AgencyApplicationDoc extends Partial<RegistrationDetails> {
  _id: ObjectId;
  /** Name shown on the platform: the brand name, or the company name when there is none. */
  agencyName: string;
  /* legalName, cif, town and regions are missing on applications from the old form; regions and
     feedUrl are not asked by the register form (the admin picks the areas when approving) */
  /** Company name (legal name) */
  legalName?: string;
  cif?: string;
  contactPerson: string;
  email: string;
  phone: string;
  town?: string;
  regions?: RegionKey[];
  feedUrl?: string;
  /** Free text from the old form (before regions). */
  areas?: string;
  /** Developer applications (/promotoras): how many developments they are selling now ("1", "2-5", "6-10", "10+"). */
  activeDevelopments?: ActiveDevelopments;
  /** Developer applications: the optional message from the form. */
  message?: string;
  status: ApplicationStatus;
  createdAt: Date;
  decidedAt: Date | null;
  rejectReason: string | null;
  agencyId: string | null;
}
