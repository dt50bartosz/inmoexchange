// app/[locale]/panel/buscar/server/actions.ts
"use server";

import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { recordContact, recordEvent } from "@/lib/server/property-events";
import { trackEventSchema } from "@/lib/schemas/property-events";

/** Phone / WhatsApp / email clicked on a partner's property. Counted once per agency, property and day. */
export async function recordContactAction(propertyId: string): Promise<ActionResult<null>> {
  await recordContact(String(propertyId));
  return ok(null);
}

/**
 * A partner's property opened (view) or "Book a viewing on WhatsApp" clicked, in the network search.
 * Called by the page after it shows, so it never slows the page down; the result is ignored.
 */
export async function trackNetworkEventAction(input: unknown): Promise<ActionResult<null, "validation_error">> {
  const parsed = trackEventSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error");
  await recordEvent(parsed.data.type, { source: "network", propertyId: parsed.data.propertyId });
  return ok(null);
}
