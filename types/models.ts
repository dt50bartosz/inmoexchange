import type { ObjectId } from "mongodb";
import type { RegionKey, SpokenLanguageKey } from "@/lib/constants/options";
import type { LangCode } from "@/lib/constants/languages";
import type { AgencyStatus } from "@/lib/constants/admin";
import type { AccountType } from "@/lib/constants/developers";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "blocked"
  | "none";

/**
 * An agency (collection "agencies").
 * Its _id as a hex string is the `agencyId` stored on properties, feeds, CRM buyers, exports and users.
 */
export interface AgencyDoc {
  _id: ObjectId;
  /** `_id` as a string: the same value as `agencyId` on the agency's login (users) and its data. Missing on very old documents. */
  agencyId?: string;
  name: string;
  slug: string;
  legalName?: string;
  cif?: string;
  contactPerson?: string;
  /** Login email (the same as the agency's user). */
  email?: string;
  phone?: string;
  whatsapp?: string;
  town?: string;
  regions?: RegionKey[];
  /** Developers: company description shown to agencies (es / en). */
  description?: { es: string; en: string };
  /** Developers: who last saved the company profile (developer panel or admin on its behalf). */
  profileUpdatedBy?: { role: "developer" | "admin"; userId: string; at: Date };
  /** "developer" = a property developer (Developer CRM). Missing = "agency". Same login and panel either way. */
  accountType?: AccountType;
  /* Developer CRM (admin only) */
  country?: string;
  contactPosition?: string;
  /** Admin user (_id hex) who looks after the account. */
  relationshipManagerId?: string | null;
  /** Last tracked activity (project change or login), for sorting the CRM. */
  lastActivityAt?: Date;
  /** Platform status set by the admin. Missing on older documents = "active". */
  status?: AgencyStatus;
  /** Public URL of the logo on R2, and its storage key (to delete it when replaced). */
  logo?: string | null;
  logoKey?: string | null;
  /** Public contact email (Mi agencia). `email` above is the login email. */
  contactEmail?: string;
  website?: string;
  zones?: string[];
  /* Profile fields edited in Mi agencia (see lib/schemas/agency.ts) */
  about?: Partial<Record<LangCode, string>>;
  defaultLanguage?: LangCode;
  street?: string;
  province?: string;
  postcode?: string;
  spokenLanguages?: SpokenLanguageKey[];
  founded?: string;
  commission?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  /* From the /join register form (see RegistrationDetails in types/admin.ts) */
  preferredLanguage?: "en" | "es";
  raicv?: string;
  ownerName?: string;
  ownerIdNumber?: string;
  phone2?: string;
  email2?: string;
  crm?: string;
  crmAgencyNumber?: string;
  billing?: { paymentFrequency: "" | "monthly" | "quarterly" | "yearly"; iban: string };
  privacyAcceptedAt?: Date;
  subscription?: {
    stripeCustomerId?: string;
    status: SubscriptionStatus;
    plan?: string;
    currentPeriodEnd?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

/** The agency's login (one login per agency). */
export interface UserDoc {
  _id: ObjectId;
  /** "agency" (missing = agency): uses /panel only. "admin": platform admin, uses /admin only, has no agency. */
  role?: UserRole;
  /** The agency's _id as a hex string, like agencyId everywhere else. null for admins. */
  agencyId: string | null;
  /** Lowercase; unique. */
  email: string;
  /** null until login details are sent. */
  passwordHash: string | null;
  /** True while the password is the temporary one from the email: the agency must choose its own at login. */
  mustChangePassword?: boolean;
  passwordChangedAt?: Date;
  /** Raised on password change/reset and "sign out everywhere": sessions with an older number stop working. */
  sessionVersion?: number;
  /** "Forgot password" link waiting to be used (1 hour). Only a hash of the token is stored. */
  passwordReset?: { tokenHash: string; expiresAt: Date } | null;
  /** New login email waiting to be confirmed from a link sent to it (24 hours). */
  emailChange?: { newEmail: string; tokenHash: string; expiresAt: Date } | null;
  /** Old invite links (before temporary passwords). Only a hash of the token is stored. */
  invite?: { tokenHash: string; expiresAt: Date } | null;
  emailVerified?: Date | null;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** "agency" → /panel, "developer" (promotora) → /promotor, "admin" → /admin. See lib/server/auth/require-role.ts. */
export type UserRole = "agency" | "developer" | "admin";

// Safe, serializable shape sent to client components
export interface CurrentAgency {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  email: string | null;
  subscriptionStatus: SubscriptionStatus;
  accountType: AccountType;
}
