// app/[locale]/contacto/server/create-contact-message.ts
"use server";

import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { collections, ensureIndexes } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { contactMessageSchema } from "@/lib/schemas/contact";
import type { ContactMessageDoc } from "@/types/contact";

/*
 * Public contact form (/contacto). Anyone can post it (no login), so like the join form:
 * - a hidden "website" field people never see; bots that fill it in get a fake "thanks"
 * - at most 5 messages per hour from the same IP address
 * Messages are only saved for now (no email, no admin screen yet).
 */
export async function createContactMessageAction(
  input: unknown
): Promise<ActionResult<null, "validation_error" | "rate_limited" | "server_error">> {
  const parsed = contactMessageSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  // Spam trap filled in: pretend it worked, save nothing
  if (parsed.data.website) return ok(null);

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await consumeRateLimit(`contact:${ip}`, 5, 60 * 60))) return fail("rate_limited");

  const v = parsed.data;
  const now = new Date();
  const doc: ContactMessageDoc = {
    _id: new ObjectId(),
    name: v.name,
    email: v.email.toLowerCase(),
    phone: v.phone,
    role: v.role,
    message: v.message,
    locale: await getLocale(),
    privacyAcceptedAt: now,
    status: "new",
    createdAt: now,
    updatedAt: now,
  };

  try {
    await ensureIndexes();
    await collections.contactMessages.insertOne(doc);
  } catch (err) {
    console.error("[contact] saving the message failed", err);
    return fail("server_error");
  }
  return ok(null);
}
