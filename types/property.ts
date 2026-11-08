import type { z } from "zod";
import type {
  priceChangeSchema,
  propertyEditSchema,
  propertyRecordSchema,
  propertySchema,
  propertySourceSchema,
} from "@/lib/schemas/property";

export type PropertyFormValues = z.input<typeof propertySchema>;
export type PropertyEditValues = z.input<typeof propertyEditSchema>;
export type PropertyEditOutput = z.output<typeof propertyEditSchema>;
export type PriceChange = z.infer<typeof priceChangeSchema>;
export type PropertySource = z.infer<typeof propertySourceSchema>;
export type Property = z.infer<typeof propertyRecordSchema>;
