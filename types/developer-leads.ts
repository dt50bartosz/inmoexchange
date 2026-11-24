// types/developer-leads.ts
// Admin → Developer calls: property developers (promotoras) to cold-call and invite (collection "developer_leads").
import type { ObjectId } from "mongodb";
import type { LeadPhoneType, LeadStatus } from "@/lib/schemas/developer-leads";

export type LeadPhone = { type: LeadPhoneType; number: string; label?: string };

export type LeadCallDoc = {
  date: Date;
  outcome: LeadStatus;
  note?: string;
  /** Exactly as stored in the lead's phones (never reformatted). */
  numberUsed?: string;
};

export interface DeveloperLeadDoc {
  _id: ObjectId;
  company: string;
  contactPerson?: string;
  /** owner, gerente, comercial… as typed (never assumed). */
  role?: string;
  /** Numbers exactly as typed or imported: never reformatted. */
  phones: LeadPhone[];
  email?: string;
  website?: string;
  area?: string;
  status: LeadStatus;
  /** Where the contact came from (website, CSV, referral…): required for GDPR. */
  source: string;
  notes?: string;
  callLog: LeadCallDoc[];
  nextCallAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadCall = Omit<LeadCallDoc, "date"> & { date: string };

/** What the admin pages get (dates as ISO strings, newest call first). */
export type DeveloperLead = Omit<
  DeveloperLeadDoc,
  "_id" | "callLog" | "nextCallAt" | "createdAt" | "updatedAt" | "contactPerson" | "role" | "email" | "website" | "area" | "notes"
> & {
  id: string;
  /** "" when not given. */
  contactPerson: string;
  role: string;
  email: string;
  website: string;
  area: string;
  notes: string;
  callLog: LeadCall[];
  nextCallAt: string | null;
  lastCallAt: string | null;
  /** The number to call first (mobile → office → other → WhatsApp), or null. */
  mainPhone: LeadPhone | null;
  createdAt: string;
  updatedAt: string;
};

/** An existing lead that a new one (or an imported row) looks like. */
export type LeadDuplicate = { id: string; company: string; reason: "phone" | "company"; match: string };
