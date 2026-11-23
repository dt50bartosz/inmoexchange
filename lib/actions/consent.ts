"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { collections, ensureIndexes } from "@/lib/db";
import { COOKIE_POLICY_VERSION } from "@/lib/cookie-consent";
import { currentLegalVersion } from "@/lib/server/legal-docs";

const recordSchema = z.object({
  id: z.string().regex(/^[\w-]{8,64}$/),
  version: z.literal(COOKIE_POLICY_VERSION),
  functional: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
  action: z.enum(["accept_all", "reject_all", "custom"]),
  method: z.enum(["banner", "preferences_centre", "account_settings"]),
});

/** The logged-in user's id, read from the session on the server (the browser can't claim to be someone). */
async function currentUserId(): Promise<string | null> {
  try {
    const id = (await auth())?.user?.id;
    return id && ObjectId.isValid(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Keeps a record of a cookie choice, to show what was agreed, when, where and under which policy versions
 * (GDPR art. 7(1)). No IP address: the random id in the visitor's cookie links them to the record, plus the
 * user id when logged in. Records delete themselves after 3 years (index in lib/db.ts). A failure never blocks the visitor.
 */
export async function recordConsentAction(input: unknown): Promise<void> {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return;
  try {
    await ensureIndexes();
    const { id, ...choice } = parsed.data;
    await collections.consentRecords.insertOne({
      consentId: id,
      userId: await currentUserId(),
      // The privacy policy in force: the published version in Admin → Legal, else the built-in text's
      privacyVersion: await currentLegalVersion("privacy"),
      ...choice,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("recordConsentAction failed", err);
  }
}
