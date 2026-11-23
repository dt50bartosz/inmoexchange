// types/legal.ts
// Versioned legal documents (collection "legal_documents"), edited in Admin → Legal, shown on the public legal pages.
import type { ObjectId } from "mongodb";
import type { LegalDocKey, LegalLang } from "@/lib/constants/legal-docs";

export type LegalDocStatus = "draft" | "published" | "archived";

/** One version of one document. Published and archived versions never change again (they are what people accepted). */
export interface LegalDocVersionDoc {
  _id: ObjectId;
  key: LegalDocKey;
  /** Shown to users and saved with every acceptance, e.g. "1.0", "2026-12". Unique per document. */
  version: string;
  status: LegalDocStatus;
  title: Record<LegalLang, string>;
  /** Cleaned HTML (cleanHtml in lib/server/blog.ts). {{…}} marks a placeholder still to be supplied by a legal professional. */
  content: Record<LegalLang, string>;
  /** What changed (admin only). */
  changeNote: string;
  /** A material change: users who accepted an older version must accept again (used by registration / account pages). */
  material: boolean;
  publishedAt: Date | null;
  createdBy: { userId: string; email: string };
  updatedBy: { userId: string; email: string };
  createdAt: Date;
  updatedAt: Date;
}

export type LegalDocVersion = Omit<LegalDocVersionDoc, "_id" | "publishedAt" | "createdAt" | "updatedAt"> & {
  id: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The version in force for each document: the published one, or the built-in text's version. */
export type CurrentLegalVersion = { key: LegalDocKey; version: string; publishedAt: string | null; source: "database" | "built_in" | "none" };

/* ---------- Acceptances (lib/server/legal-acceptances.ts) ---------- */

export type RegistrationAudience = "agency" | "developer";

/** A document someone must accept, at the version in force. */
export type RequiredLegalDoc = { key: LegalDocKey; version: string; path: string };

export type LegalAcceptanceMethod = "registration" | "first_login" | "reacceptance" | "account_settings";

/** One acceptance (or marketing choice). Append-only. */
export interface LegalAcceptanceDoc {
  _id: ObjectId;
  /** "document": a legal document at a version; "authorised_signatory": "I'm authorised to register the company"; "marketing": the marketing choice. */
  kind: "document" | "authorised_signatory" | "marketing";
  key: LegalDocKey | null;
  version: string | null;
  /** Always true for documents (they can't be refused and still register); the marketing choice can be either. */
  granted: boolean;
  /** Set when made on a registration form; the account and login are filled in when the application is approved. */
  applicationId: string | null;
  orgId: string | null;
  userId: string | null;
  email: string;
  audience: RegistrationAudience | "admin";
  method: LegalAcceptanceMethod;
  /** Language the person used. */
  locale: string;
  createdAt: Date;
}
