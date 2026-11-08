// app/[locale]/listings/[code]/server/actions.ts
"use server";

import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { recordEvent } from "@/lib/server/property-events";
import { trackListingEventSchema } from "@/lib/schemas/property-events";

/**
 * The public property page was viewed (no login). Called by the page after it shows, so it never slows
 * the page down; the result is ignored. Only properties that are really public are counted.
 */
export async function trackListingEventAction(input: unknown): Promise<ActionResult<null, "validation_error">> {
  const parsed = trackListingEventSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error");
  await recordEvent(parsed.data.type, { source: "public", code: parsed.data.code });
  return ok(null);
}
