import { z } from "zod";
import { PROPERTY_CONDITIONS, PROPERTY_TYPES } from "@/lib/constants/property";
import { REGION_KEYS } from "@/lib/constants/options";
import { EXPORT_NAME_MAX } from "@/lib/constants/xmlExport";
import { V } from "./shared";

const optionalPrice = z.number({ error: V.number }).positive(V.positive).nullable();

/** Create / edit an XML export link. The filters match the Search page. */
export const xmlExportSchema = z
  .object({
    name: z.string().trim().min(1, V.required).max(EXPORT_NAME_MAX, V.tooLong),
    query: z.string().trim().max(60, V.tooLong),
    area: z.union([z.literal("all"), z.enum(REGION_KEYS)]),
    type: z.union([z.literal("all"), z.enum(PROPERTY_TYPES)]),
    // Links saved before this filter existed have no condition: "all"
    condition: z.union([z.literal("all"), z.enum(PROPERTY_CONDITIONS)]).default("all"),
    minPrice: optionalPrice,
    maxPrice: optionalPrice,
    minBeds: z.number().int().min(0).max(10),
  })
  .refine((v) => v.minPrice == null || v.maxPrice == null || v.maxPrice >= v.minPrice, {
    path: ["maxPrice"],
    message: V.priceRange,
  });
