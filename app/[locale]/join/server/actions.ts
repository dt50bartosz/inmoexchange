// app/[locale]/join/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { collections, ensureIndexes } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { newApplicationEmail, sendEmail } from "@/lib/server/email";
import { agencyApplicationSchema } from "@/lib/schemas/admin";
import { normalizeIban } from "@/lib/schemas/shared";
import type { AgencyApplicationDoc } from "@/types/admin";
import { checkConsent, recordAcceptances } from "@/lib/server/legal-acceptances";

/*
 * Public "Join as an agency" form. Anyone can post it (no login), so it is protected against spam:
 * - a hidden "faxNumber" field people never see; bots that fill it in get a fake "thanks"
 * - at most 5 requests per hour from the same IP address
 * The request becomes a pending application in Admin → Applications.
 */

export async function submitApplicationAction(
  input: unknown
): Promise<ActionResult<null, "validation_error" | "rate_limited" | "legal_outdated">> {
  const parsed = agencyApplicationSchema.safeParse(input);
  // The legal boxes: every document in force ticked (at the version shown), authorised, marketing optional
  const consent = await checkConsent("agency", (input as { legal?: unknown } | null)?.legal);
  if (!parsed.success || !consent.ok) {
    if (!consent.ok && consent.error === "legal_outdated") return fail("legal_outdated");
    return fail("validation_error", { ...(parsed.success ? {} : zodFieldErrors(parsed.error)), ...(consent.ok ? {} : consent.fieldErrors) });
  }

  // Spam trap filled in: pretend it worked, save nothing
  if (parsed.data.faxNumber) return ok(null);

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await consumeRateLimit(`join:${ip}`, 5, 60 * 60))) return fail("rate_limited");

  const v = parsed.data;
  const email = v.email.toLowerCase();
  await ensureIndexes();

  // Sending the form twice shouldn't create two pending applications
  const already = await collections.applications.findOne({ email, status: "pending" }, { projection: { _id: 1 } });
  if (already) return ok(null);

  const doc: AgencyApplicationDoc = {
    _id: new ObjectId(),
    agencyName: v.brandName || v.companyName,
    legalName: v.companyName,
    brandName: v.brandName,
    cif: v.cif.replace(/[\s-]/g, "").toUpperCase(), // same as createAgency
    raicv: v.raicv,
    website: v.website,
    street: v.street,
    town: v.town,
    province: v.province,
    postcode: v.postcode,
    ownerName: v.ownerName,
    ownerIdNumber: v.ownerIdNumber.replace(/\s/g, "").toUpperCase(),
    contactPerson: v.contactPerson,
    email,
    phone: v.phone,
    phone2: v.phone2,
    email2: v.email2.toLowerCase(),
    preferredLanguage: v.preferredLanguage,
    accountType: "agency", // public sign-up is for agencies only
    crm: v.crm,
    crmAgencyNumber: v.crmAgencyNumber,
    paymentFrequency: v.paymentFrequency,
    iban: normalizeIban(v.iban),
    privacyAcceptedAt: new Date(),
    status: "pending",
    createdAt: new Date(),
    decidedAt: null,
    rejectReason: null,
    agencyId: null,
  };
  await collections.applications.insertOne(doc);
  // One record per accepted document version + authorisation + marketing choice; linked to the account on approval
  await recordAcceptances(consent.data, { applicationId: doc._id.toHexString(), email }, "registration", await getLocale());

  // Tell the admins (an email failure doesn't stop the application)
  const admins = await collections.users.find({ role: "admin" }, { projection: { email: 1 } }).toArray();
  await Promise.all(
    admins.map((a) =>
      sendEmail(newApplicationEmail({ to: a.email, agencyName: doc.agencyName, contactPerson: doc.contactPerson, email: doc.email, town: doc.town ?? "" }))
    )
  );
  return ok(null);
}
