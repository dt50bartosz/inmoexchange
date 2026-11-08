// lib/schemas/property-events.ts
// What a property page sends to record a view or a WhatsApp click (lib/server/property-events.ts).
// The source (network / microsite / public) is never sent by the browser: it is decided by which page's action is called.
import { z } from "zod";

/** Same pattern as PROPERTY_CODE_RE in lib/server/property-code.ts (server-only, so not imported here). */
const PROPERTY_CODE = /^[A-Z]{2}-\d{4}$/;

/** The events a page may record. "contact" (Show contact in the network) is recorded by its own action. */
export const TRACKED_EVENT_TYPES = ["view", "whatsapp_click"] as const;

const type = z.enum(TRACKED_EVENT_TYPES);

/** Network search and client pages: the property by its id. */
export const trackEventSchema = z.object({
  propertyId: z.string().regex(/^[a-f0-9]{24}$/i),
  type,
});

/** Public /listings/[code]: the page only knows the platform code (e.g. KT-4821). */
export const trackListingEventSchema = z.object({
  code: z.string().trim().toUpperCase().regex(PROPERTY_CODE),
  type,
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;
export type TrackListingEventInput = z.infer<typeof trackListingEventSchema>;
