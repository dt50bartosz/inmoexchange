// app/[locale]/promotoras/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { collections, ensureIndexes } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { newApplicationEmail, sendEmail } from "@/lib/server/email";
import { developerApplicationSchema } from "@/lib/schemas/developer-application";
import type { AgencyApplicationDoc } from "@/types/admin";

/*
 * Public "Para promotoras" form. Same system as the agency /join form: the request becomes a pending
 * application (accountType "developer") in Admin → Applications; approving it creates the developer account.
 * Anyone can post it (no login), so:
 * - a hidden "faxNumber" field people never see; bots that fill it in get a fake "thanks"
 * - at most 5 requests per hour from the same IP address
 */
export async function submitDeveloperApplicationAction(
  input: unknown
): Promise<ActionResult<null, "validation_error" | "rate_limited" | "server_error">> {
  const parsed = developerApplicationSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  // Spam trap filled in: pretend it worked, save nothing
  if (parsed.data.faxNumber) return ok(null);

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await consumeRateLimit(`developer-apply:${ip}`, 5, 60 * 60))) return fail("rate_limited");

  const v = parsed.data;
  const email = v.email.toLowerCase();
  const now = new Date();

  try {
    await ensureIndexes();
    // Sending the form twice shouldn't create two pending applications
    const already = await collections.applications.findOne({ email, status: "pending" }, { projection: { _id: 1 } });
    if (already) return ok(null);

    const doc: AgencyApplicationDoc = {
      _id: new ObjectId(),
      agencyName: v.company,
      legalName: v.company,
      contactPerson: v.fullName,
      email,
      phone: v.phone,
      website: v.website,
      feedUrl: v.feedUrl,
      activeDevelopments: v.activeDevelopments,
      message: v.message,
      accountType: "developer",
      // Emails and the account are in Spanish or English (Polish visitors get English)
      preferredLanguage: (await getLocale()) === "es" ? "es" : "en",
      // Not asked on this form: the admin completes them when approving (same fields as an agency application)
      brandName: "",
      cif: "",
      raicv: "",
      town: "",
      street: "",
      province: "",
      postcode: "",
      ownerName: "",
      ownerIdNumber: "",
      phone2: "",
      email2: "",
      crm: "",
      crmAgencyNumber: "",
      paymentFrequency: "",
      iban: "",
      privacyAcceptedAt: now,
      status: "pending",
      createdAt: now,
      decidedAt: null,
      rejectReason: null,
      agencyId: null,
    };
    await collections.applications.insertOne(doc);
  } catch (err) {
    console.error("[promotoras] saving the application failed", err);
    return fail("server_error");
  }

  // Tell the admins (an email failure doesn't stop the application)
  const admins = await collections.users.find({ role: "admin" }, { projection: { email: 1 } }).toArray().catch(() => []);
  await Promise.all(
    admins.map((a) =>
      sendEmail(newApplicationEmail({ to: a.email, agencyName: v.company, contactPerson: v.fullName, email, town: "", kind: "developer" })).catch(() => undefined)
    )
  );
  return ok(null);
}
