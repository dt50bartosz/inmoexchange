"use server";

import { z } from "zod";
import { collections, ensureIndexes } from "@/lib/db";
import { COOKIE_POLICY_VERSION } from "@/lib/cookie-consent";

const recordSchema = z.object({
  id: z.string().regex(/^[\w-]{8,64}$/),
  version: z.literal(COOKIE_POLICY_VERSION),
  analytics: z.boolean(),
  marketing: z.boolean(),
  action: z.enum(["accept_all", "reject_all", "custom"]),
});

/**
 * Keeps a record of a cookie choice, to show what was agreed and when (GDPR art. 7(1)).
 * No IP address or account: the random id in the visitor's cookie links them to the record.
 * Records delete themselves after 3 years (index in lib/db.ts). A failure never blocks the visitor.
 */
export async function recordConsentAction(input: unknown): Promise<void> {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return;
  try {
    await ensureIndexes();
    const { id, ...choice } = parsed.data;
    await collections.consentRecords.insertOne({ consentId: id, ...choice, createdAt: new Date() });
  } catch (err) {
    console.error("recordConsentAction failed", err);
  }
}
