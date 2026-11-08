// lib/schemas/crm.ts
import { z } from "zod";
import { LANGUAGES, LEAD_SOURCES, PROPERTY_TYPES, STAGES, type StageId } from "@/types/crm";

const STAGE_IDS = STAGES.map((s) => s.id) as [StageId, ...StageId[]];

/** Form fields often send "" or null for "empty"; treat both as not set. */
const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

const optText = (max: number) => z.preprocess(emptyToUndef, z.string().trim().max(max).optional());
const optInt = (max: number) => z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(max).optional());

export const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
export const stageSchema = z.enum(STAGE_IDS);
export const noteSchema = z.string().trim().min(1, "Note is empty").max(5000, "Note is too long");

/** A buyer's editable fields. Used for both adding and editing. Unknown keys are dropped. */
export const contactSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.preprocess(emptyToUndef, z.string().trim().toLowerCase().email("Invalid email").max(200).optional()),
    phone: optText(40),
    language: z.enum(LANGUAGES),
    source: z.enum(LEAD_SOURCES),
    budgetMin: optInt(100_000_000),
    budgetMax: optInt(100_000_000),
    areas: z.array(z.string().trim().min(1).max(80)).max(30),
    propertyTypes: z.array(z.enum(PROPERTY_TYPES)).max(PROPERTY_TYPES.length),
    bedroomsMin: optInt(20),
    stage: stageSchema,
    lastContactAt: z.preprocess(
      emptyToUndef,
      z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date").optional()
    ),
    nextFollowUpAt: z.preprocess(emptyToUndef, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional()),
    arrivalDate: z.preprocess(emptyToUndef, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional()),
  })
  .refine((v) => v.budgetMin == null || v.budgetMax == null || v.budgetMax >= v.budgetMin, {
    message: "Max budget must be at least the min budget",
    path: ["budgetMax"],
  })
  // The form asks for one of them; the server checks it too
  .refine((v) => !!v.email || !!v.phone, {
    message: "Add an email or a phone number so you can reach this buyer.",
    path: ["phone"],
  });

export type ContactValues = z.infer<typeof contactSchema>;