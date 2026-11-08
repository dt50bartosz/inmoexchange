import { z } from "zod";
import { PROPERTY_TYPES } from "@/lib/constants/property";
import {
  AMENITIES,
  COLLABORATION_TYPES,
  CURRENCIES,
  DOCUMENTS_MAX,
  DOCUMENT_KINDS,
  PROJECT_IMAGES_MAX,
  PROJECT_STATUSES,
} from "@/lib/constants/developers";
import { RE, V, optionalMatch } from "./shared";

/*
 * Developments (collection "dev_projects"): one schema for the developer panel (/promotor/promociones)
 * and the admin acting on the developer's behalf. Messages are translation keys under panel.validation.
 */

const text = (max: number) => z.string().trim().max(max, V.tooLong);
const required = (max: number) => text(max).min(1, V.required);
/** "" or a calendar date "2027-06-30". */
const dateOnly = z.string().refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "date");
const optionalInt = (min: number, max: number) => z.number({ error: V.number }).int(V.number).min(min, V.number).max(max, V.tooLong).nullable();

/** One image: a saved one (key under projects/), or a fresh upload (key under pending/). */
export const projectImageSchema = z.object({
  id: z.string().min(1).max(300),
  url: z.string().min(1).max(2000),
  key: z.string().min(1).max(300),
  width: z.number().int().positive().max(10_000).optional(),
  height: z.number().int().positive().max(10_000).optional(),
});

/** One PDF: a saved one (key under projects/), or a fresh upload (key under pending/). The server re-checks both. */
export const developmentDocumentSchema = z.object({
  id: z.string().min(1).max(300),
  key: z.string().min(1).max(300),
  kind: z.enum(DOCUMENT_KINDS),
  name: required(120),
  /** Shown in the form for saved files; the server never uses it (the stored url is kept). */
  url: z.string().max(2000).optional(),
});

/**
 * What the developer offers agencies that sell a unit. Nothing is filled in for them:
 * `value` stays empty until the developer sets it (publishing needs it, see the server).
 */
export const collaborationSchema = z
  .object({
    type: z.enum(COLLABORATION_TYPES),
    value: z.number({ error: V.number }).positive(V.number).max(1_000_000_000, V.tooLong).nullable(),
    currency: z.enum(CURRENCIES),
    paymentTerms: text(1000),
    notes: text(1000),
  })
  .superRefine((v, ctx) => {
    if (v.type === "percent" && v.value !== null && v.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: V.number });
  });

export const developmentSchema = z
  .object({
    name: required(120),
    address: text(200),
    town: required(100),
    province: text(100),
    country: text(60),
    latitude: z.number().min(-90, "latitude").max(90, "latitude").nullable(),
    longitude: z.number().min(-180, "longitude").max(180, "longitude").nullable(),
    mapsUrl: z.string().trim().max(1000, V.tooLong).refine(optionalMatch(RE.url), V.url),
    description: z.object({ es: text(8000), en: text(8000) }),
    amenities: z.array(z.enum(AMENITIES)),
    images: z.array(projectImageSchema).max(PROJECT_IMAGES_MAX, V.tooLong),
    /** id of one of `images`; null = the first one. */
    mainImageId: z.string().max(300).nullable(),
    documents: z.array(developmentDocumentSchema).max(DOCUMENTS_MAX, V.tooLong),
    unitsTotal: optionalInt(0, 10_000),
    unitsAvailable: optionalInt(0, 10_000),
    propertyTypes: z.array(z.enum(PROPERTY_TYPES)),
    priceFrom: optionalInt(0, 1_000_000_000),
    priceTo: optionalInt(0, 1_000_000_000),
    currency: z.enum(CURRENCIES),
    bedroomsMin: optionalInt(0, 20),
    bedroomsMax: optionalInt(0, 20),
    status: z.enum(PROJECT_STATUSES),
    /** Delivery date. */
    expectedCompletion: dateOnly,
    actualCompletion: dateOnly,
    collaboration: collaborationSchema,
    /** Days an accepted client registration protects the agency. */
    protectionDays: z.number({ error: V.number }).int(V.number).min(1, V.number).max(730, V.tooLong),
  })
  .superRefine((v, ctx) => {
    if ((v.latitude === null) !== (v.longitude === null)) {
      ctx.addIssue({ code: "custom", path: [v.latitude === null ? "latitude" : "longitude"], message: "coordinatesPair" });
    }
    if (v.priceFrom !== null && v.priceTo !== null && v.priceTo < v.priceFrom) {
      ctx.addIssue({ code: "custom", path: ["priceTo"], message: V.priceRange });
    }
    if (v.bedroomsMin !== null && v.bedroomsMax !== null && v.bedroomsMax < v.bedroomsMin) {
      ctx.addIssue({ code: "custom", path: ["bedroomsMax"], message: "bedroomRange" });
    }
    if (v.unitsTotal !== null && v.unitsAvailable !== null && v.unitsAvailable > v.unitsTotal) {
      ctx.addIssue({ code: "custom", path: ["unitsAvailable"], message: "unitsAvailable" });
    }
    if (v.mainImageId !== null && !v.images.some((i) => i.id === v.mainImageId)) {
      ctx.addIssue({ code: "custom", path: ["mainImageId"], message: V.required });
    }
  });

/** Draft ↔ published. */
export const developmentVisibilitySchema = z.enum(["draft", "published"]);
