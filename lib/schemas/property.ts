import { z } from "zod";
import { REGION_KEYS } from "@/lib/constants/options";
import {
  DESCRIPTION_MAX,
  ENERGY_RATINGS,
  FEATURE_KEYS,
  PHOTO_MAX_COUNT,
  PROPERTY_CONDITIONS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
} from "@/lib/constants/property";
import { V } from "./shared";

/*
 * Property schemas — shared by the form (zodResolver) and the server actions,
 * so both always apply the same rules.
 *
 * Number inputs already arrive as numbers (register "setValueAs" in the form):
 * required fields arrive as undefined when empty, optional ones as null.
 */

// Messages are keys under panel.validation (see V in shared.ts), translated by FormField
const REQUIRED = V.required;
/** Lower limit: 0 or more → "whole number, 0 or more"; above 0 → "greater than 0". */
const minMessage = (min: number) => (min > 0 ? V.positive : V.number);

/** Where the coordinates came from: the town centre, a geocoded address, typed in, or the agency's feed. */
export const COORDINATES_SOURCES = ["town", "address", "manual", "feed"] as const;

const requiredInt = (min: number, max: number) =>
  z.number({ error: REQUIRED }).int(V.number).min(min, minMessage(min)).max(max, V.tooBig);

const optionalNumber = (min: number, max: number) =>
  z.number({ error: V.number }).min(min, minMessage(min)).max(max, V.tooBig).nullable();

const currentYear = new Date().getFullYear();

/**
 * One photo.
 * - New upload: key starts with "pending/", url is a local preview.
 * - Saved photo: key starts with "properties/", url is the public R2 URL.
 * - Feed photo: no key, url points to the agency's own server.
 */
export const photoSchema = z.object({
  id: z.string().min(1).max(300),
  url: z.string().min(1).max(2000),
  key: z.string().max(300).nullable().optional(),
  width: z.number().int().positive().max(10_000).optional(),
  height: z.number().int().positive().max(10_000).optional(),
});

const descriptionSchema = z
  .object({
    en: z.string().trim().max(DESCRIPTION_MAX, V.tooLong),
    es: z.string().trim().max(DESCRIPTION_MAX, V.tooLong),
    pl: z.string().trim().max(DESCRIPTION_MAX, V.tooLong),
  })
  // At least one language must be filled in.
  .refine((d) => Object.values(d).some((text) => text.length > 0), {
    message: "descriptionRequired",
  });

const propertyFields = {
  // Basics
  type: z.enum(PROPERTY_TYPES, { error: REQUIRED }),
  condition: z.enum(PROPERTY_CONDITIONS, { error: REQUIRED }),
  reference: z.string().trim().min(1, REQUIRED).max(50, V.tooLong),

  // Location
  town: z.string().trim().min(1, REQUIRED).max(100, V.tooLong),
  province: z.string().trim().max(100, V.tooLong),
  area: z.enum(REGION_KEYS, { error: REQUIRED }),
  address: z.string().trim().max(200, V.tooLong),
  hideAddress: z.boolean(),
  /** WGS84 degrees; both or neither. Missing ones become the town centre on the server. */
  latitude: z.number().min(-90, "latitude").max(90, "latitude").nullable(),
  longitude: z.number().min(-180, "longitude").max(180, "longitude").nullable(),
  coordinatesSource: z.enum(COORDINATES_SOURCES).nullable(),

  // Price and size
  price: requiredInt(1, 100_000_000),
  bedrooms: requiredInt(0, 50),
  bathrooms: requiredInt(0, 50),
  builtM2: z.number({ error: REQUIRED }).positive(V.positive).max(100_000, V.tooBig),
  plotM2: optionalNumber(1, 10_000_000),
  yearBuilt: z.number({ error: V.year }).int(V.year).min(1800, V.year).max(currentYear + 5, V.year).nullable(),
  energyRating: z.enum(ENERGY_RATINGS).nullable(),
  communityFees: optionalNumber(0, 100_000),

  // Features, photos, description
  features: z.array(z.enum(FEATURE_KEYS)),
  photos: z.array(photoSchema).max(PHOTO_MAX_COUNT, V.tooLong),
  description: descriptionSchema,

  // Sharing
  status: z.enum(PROPERTY_STATUSES),
  shared: z.boolean(),
  commission: z.string().trim().max(20, V.tooLong),
};

/** Commission is required only when the property is shared. */
const commissionRule = (
  v: { shared: boolean; commission: string },
  ctx: z.RefinementCtx,
) => {
  if (v.shared && v.commission.length === 0) {
    ctx.addIssue({ code: "custom", path: ["commission"], message: REQUIRED });
  }
};

/** Latitude and longitude come together: one without the other is no location. */
const coordinatesRule = (v: { latitude: number | null; longitude: number | null }, ctx: z.RefinementCtx) => {
  if ((v.latitude === null) !== (v.longitude === null)) {
    ctx.addIssue({ code: "custom", path: [v.latitude === null ? "latitude" : "longitude"], message: "coordinatesPair" });
  }
};

/** A property's editable fields (used when creating). */
export const propertySchema = z.object(propertyFields).superRefine(commissionRule).superRefine(coordinatesRule);

/** The add/edit form. On edit, a new price moves the old one into the price history. */
export const propertyEditSchema = z
  .object({
    ...propertyFields,
    newPrice: z.number({ error: V.number }).int(V.number).min(1, V.positive).max(100_000_000, V.tooBig).nullable(),
  })
  .superRefine(commissionRule)
  .superRefine(coordinatesRule);

export const priceChangeSchema = z.object({
  price: z.number(),
  date: z.string(), // ISO date
});

export const propertySourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("manual") }),
  z.object({ kind: z.literal("feed"), feedId: z.string() }),
]);

/** A saved property, as the panel receives it. Dates are ISO strings. */
export const propertyRecordSchema = z.object({
  ...propertyFields,
  id: z.string(),
  /** Platform-wide code "AA-1234", made by the server; the main reference everywhere. */
  code: z.string(),
  source: propertySourceSchema,
  hidden: z.boolean(),
  /** Straight-line km from the town centre, worked out by the server; null without coordinates. */
  distanceFromTown: z.number().nullable(),
  priceHistory: z.array(priceChangeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Property = z.infer<typeof propertyRecordSchema>;
export type PropertyPhoto = z.infer<typeof photoSchema>;

/**
 * If the price was lowered at the last change, returns the previous (higher)
 * price, e.g. to show "Reduced from €450,000". Otherwise returns null.
 */
export function reducedFrom(p: Pick<Property, "price" | "priceHistory">): number | null {
  const last = p.priceHistory.at(-1);
  return last && last.price > p.price ? last.price : null;
}