import { z } from "zod";
import { PROPERTY_TYPES } from "@/lib/constants/property";
import { BULK_UNITS_MAX, ORIENTATIONS, UNIT_STATUSES } from "@/lib/constants/developers";
import { V } from "./shared";

/*
 * Units inside a development (collection "dev_units"): one schema for the developer panel and the admin acting
 * on the developer's behalf. Messages are translation keys under panel.validation.
 */

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const int = (min: number, max: number) => z.number({ error: V.number }).int(V.number).min(min, V.number).max(max, V.tooLong);
const m2 = z.number({ error: V.number }).min(0, V.number).max(1_000_000, V.tooLong).nullable();

export const unitSchema = z.object({
  /** The developer's own name for the unit: "3B", "Villa 12", "Bloque 2 – 1ºA". Unique inside the development. */
  reference: z.string().trim().min(1, V.required).max(40, V.tooLong),
  type: z.enum(PROPERTY_TYPES),
  bedrooms: int(0, 20),
  bathrooms: int(0, 20),
  builtM2: m2,
  plotM2: m2,
  terraceM2: m2,
  /** Free text: "Bajo", "3", "Ático". */
  floor: z.string().trim().max(20, V.tooLong),
  orientation: z.union([z.literal(""), z.enum(ORIENTATIONS)]),
  price: int(0, 1_000_000_000).nullable(),
  status: z.enum(UNIT_STATUSES),
});

/**
 * Bulk edit on selected units: a new status, a new price for all of them, or a price change in %.
 * At least one change. Prices are rounded to whole euros.
 */
export const bulkUnitsSchema = z
  .object({
    ids: z.array(z.string().refine((v) => OBJECT_ID.test(v))).min(1).max(BULK_UNITS_MAX),
    status: z.enum(UNIT_STATUSES).optional(),
    price: z
      .discriminatedUnion("mode", [
        z.object({ mode: z.literal("set"), value: int(0, 1_000_000_000) }),
        z.object({ mode: z.literal("percent"), value: z.number({ error: V.number }).min(-90, V.number).max(500, V.number) }),
      ])
      .optional(),
  })
  .refine((v) => v.status !== undefined || v.price !== undefined, { message: V.required, path: ["status"] });

/** Rows the "Nueva promoción" units table can send at once. */
export const NEW_UNITS_MAX = 200;

/**
 * One row of the units table on "Nueva promoción": the main figures only. The server adds the rest
 * (status available, no plot / terrace / orientation), which the developer can change later on the Unidades tab.
 */
export const newUnitRowSchema = unitSchema
  .pick({ reference: true, type: true, bedrooms: true, bathrooms: true, builtM2: true, floor: true, price: true })
  // Optional: only asked for types with a plot (see PLOT_TYPES)
  .extend({ plotM2: unitSchema.shape.plotM2.optional() });

/** Types whose units have their own plot: the table asks "m² parcela" only for these (others save no plot size). */
export const PLOT_TYPES = ["townhouse", "villa", "plot"] as const satisfies readonly (typeof unitSchema.shape.type.options)[number][];
export const hasPlot = (type: string) => (PLOT_TYPES as readonly string[]).includes(type);

/**
 * Rows whose reference repeats an earlier one, ignoring case ("3B" = "3b", like the database index): { "<row>.reference": key }.
 * Works on unchecked input too, so the form can show duplicates together with the other errors.
 */
export function duplicateReferenceErrors(rows: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(rows)) return out;
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const ref = (r as { reference?: unknown } | null)?.reference;
    const key = typeof ref === "string" ? ref.trim().toLocaleLowerCase("es") : "";
    if (!key) return;
    if (seen.has(key)) out[`${i}.reference`] = "unit_reference_taken";
    seen.add(key);
  });
  return out;
}

/** The whole table: at most NEW_UNITS_MAX rows, references unique ignoring case. */
export const newUnitsSchema = z
  .array(newUnitRowSchema)
  .max(NEW_UNITS_MAX, V.tooLong)
  .superRefine((rows, ctx) => {
    for (const path of Object.keys(duplicateReferenceErrors(rows))) {
      ctx.addIssue({ code: "custom", path: [Number(path.split(".")[0]), "reference"], message: "unit_reference_taken" });
    }
  });

/** All the table's errors at once: duplicates plus the schema's ("<row>.<field>" → key); {} when valid. */
export function newUnitsErrors(rows: unknown): Record<string, string> {
  const parsed = newUnitsSchema.safeParse(rows);
  if (parsed.success) return {};
  const errors: Record<string, string> = { ...duplicateReferenceErrors(rows) };
  for (const issue of parsed.error.issues) errors[issue.path.join(".")] ??= issue.message;
  return errors;
}

export type NewUnitRow = z.input<typeof newUnitRowSchema>;
