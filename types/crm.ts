import type { ObjectId } from "mongodb";

export type StageId =
  | "new"
  | "contacted"
  | "qualified"
  | "viewing"
  | "offer"
  | "closed"
  | "lost";

export interface Stage {
  id: StageId;
  label: string;
}

export const STAGES: Stage[] = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "viewing", label: "Viewing" },
  { id: "offer", label: "Offer" },
  { id: "closed", label: "Closed" },
  { id: "lost", label: "Lost" },
];

export const ACTIVE_STAGES = STAGES.filter((s) => s.id !== "lost");

export const STAGE_LABEL: Record<StageId, string> = Object.fromEntries(
  STAGES.map((s) => [s.id, s.label])
) as Record<StageId, string>;

export const LEAD_SOURCES = [
  "Website",
  "Idealista",
  "Rightmove",
  "Kyero",
  "Partner agency",
  "Referral",
  "Walk-in",
  "Other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const PROPERTY_TYPES = [
  "Apartment",
  "Penthouse",
  "Bungalow",
  "Townhouse",
  "Villa",
  "Plot",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const LANGUAGES = ["EN", "ES", "PL", "DE", "NL", "FR", "SV", "NO", "RU"] as const;

export interface Note {
  id: string;
  kind: "note" | "stage";
  body: string;
  createdAt: string; // ISO timestamp
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  language: string;
  source: LeadSource;
  budgetMin?: number;
  budgetMax?: number;
  areas: string[];
  propertyTypes: PropertyType[];
  bedroomsMin?: number;
  stage: StageId;
  createdAt: string; // ISO timestamp
  lastContactAt?: string; // ISO timestamp
  nextFollowUpAt?: string; // YYYY-MM-DD
  arrivalDate?: string; // YYYY-MM-DD, when the buyer arrives in Spain
  notes: Note[];
}

export type ContactInput = Omit<Contact, "id" | "createdAt" | "notes">;

/** The next active stage, or null if the buyer is closed or lost. */
export function nextStage(stage: StageId): Stage | null {
  if (stage === "lost" || stage === "closed") return null;
  const i = ACTIVE_STAGES.findIndex((s) => s.id === stage);
  return ACTIVE_STAGES[i + 1] ?? null;
}

/* ---------- MongoDB documents (server only; type imports are erased in the browser) ---------- */

export interface NoteDoc {
  id: string; // ObjectId hex, generated on the server
  kind: Note["kind"];
  body: string;
  createdAt: Date;
}

export interface ContactDoc {
  _id: ObjectId;
  agencyId: string;
  name: string;
  email?: string;
  phone?: string;
  language: string;
  source: LeadSource;
  budgetMin?: number;
  budgetMax?: number;
  areas: string[];
  propertyTypes: PropertyType[];
  bedroomsMin?: number;
  stage: StageId;
  createdAt: Date;
  updatedAt: Date;
  lastContactAt?: Date;
  nextFollowUpAt?: string; // YYYY-MM-DD, kept as a string so there are no timezone shifts
  arrivalDate?: string; // YYYY-MM-DD, same reason
  notes: NoteDoc[]; // newest first
  deletedAt?: Date; // soft delete
}