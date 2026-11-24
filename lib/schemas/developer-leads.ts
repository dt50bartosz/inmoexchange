import { z } from "zod";
import { RE, V, optionalMatch } from "./shared";

/*
 * Admin → Developer calls (developer_leads) — shared by the forms (zodResolver), the CSV import preview and the
 * server actions. Messages are translation keys under panel.validation (FormField translates them).
 * Phone numbers are kept exactly as typed: they are checked, never rewritten.
 */

export const LEAD_STATUSES = ["new", "no_answer", "callback", "interested", "not_interested", "joined", "do_not_call"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Hidden from the list by default and never in the call order. */
export const CLOSED_LEAD_STATUSES: readonly LeadStatus[] = ["not_interested", "do_not_call"];

export const LEAD_PHONE_TYPES = ["mobile", "office", "whatsapp", "other"] as const;
export type LeadPhoneType = (typeof LEAD_PHONE_TYPES)[number];

const text = (max: number) => z.string().trim().max(max, V.tooLong);
const required = (max: number) => text(max).min(1, V.required);
/** "www.promotora.es" is accepted and saved as "https://www.promotora.es". */
const withScheme = (v: string) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v);

/** "" (none), a day "2026-11-25" or a day and time "2026-11-25T10:30" (Spain time, from <input type="date|datetime-local">). */
export const callDateSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v), V.invalid);

export const leadPhoneSchema = z.object({
  type: z.enum(LEAD_PHONE_TYPES, { message: V.pickOne }),
  number: required(30).regex(RE.phone, V.phone),
  label: text(40),
});

/** Add / edit a developer. A developer without a number is allowed (it shows as "no number"). */
export const developerLeadSchema = z.object({
  company: required(160),
  contactPerson: text(120),
  role: text(80),
  phones: z.array(leadPhoneSchema).max(10, V.tooLong),
  email: z.string().trim().max(200, V.tooLong).refine(optionalMatch(RE.email), V.email),
  website: text(200).transform(withScheme).refine(optionalMatch(RE.url), V.url),
  area: text(80),
  status: z.enum(LEAD_STATUSES, { message: V.pickOne }),
  source: required(120),
  notes: text(5000),
  nextCallAt: callDateSchema,
});
export type DeveloperLeadInput = z.input<typeof developerLeadSchema>;
export type DeveloperLeadValues = z.output<typeof developerLeadSchema>;

/**
 * Log a call. The outcome becomes the lead's status; the callback date sets the next call (cleared when empty).
 * A "callback" outcome needs a date.
 */
export const logCallSchema = z
  .object({
    numberUsed: text(30),
    outcome: z.enum(LEAD_STATUSES, { message: V.pickOne }),
    note: text(1000),
    nextCallAt: callDateSchema,
  })
  .refine((v) => v.outcome !== "callback" || v.nextCallAt !== "", { path: ["nextCallAt"], message: V.required });
export type LogCallInput = z.input<typeof logCallSchema>;

/* ---------- CSV import ---------- */

/** Rows per import (one server request). */
export const LEAD_IMPORT_MAX_ROWS = 2000;

/** Columns of the CSV template, in order. Empty cells are fine except company and source. */
export const LEAD_CSV_COLUMNS = [
  "company",
  "contactPerson",
  "role",
  "mobile",
  "office",
  "whatsapp",
  "otherPhone",
  "email",
  "website",
  "area",
  "status",
  "source",
  "notes",
] as const;
export type LeadCsvColumn = (typeof LEAD_CSV_COLUMNS)[number];

const cell = z.string().optional().default("");

/** One CSV row → the same values as the form (status defaults to "new"). */
export const leadCsvRowSchema = z
  .object(Object.fromEntries(LEAD_CSV_COLUMNS.map((c) => [c, cell])) as Record<LeadCsvColumn, typeof cell>)
  .transform((r) => ({
    company: r.company,
    contactPerson: r.contactPerson,
    role: r.role,
    phones: (
      [
        ["mobile", r.mobile],
        ["office", r.office],
        ["whatsapp", r.whatsapp],
        ["other", r.otherPhone],
      ] as const
    )
      .filter(([, n]) => n.trim() !== "")
      .map(([type, number]) => ({ type, number: number.trim(), label: "" })),
    email: r.email,
    website: r.website,
    area: r.area,
    status: r.status.trim() === "" ? "new" : r.status.trim(),
    source: r.source,
    notes: r.notes,
    nextCallAt: "",
  }))
  .pipe(developerLeadSchema);
