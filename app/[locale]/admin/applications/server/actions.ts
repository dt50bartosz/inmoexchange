// app/[locale]/admin/applications/server/actions.ts
"use server";

import { collections } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { createAgency } from "@/lib/server/admin/agencies";
import { findApplication, registrationForAgency, toApplication } from "@/lib/server/admin/applications";
import { addAgencySchema, rejectApplicationSchema } from "@/lib/schemas/admin";
import { applicationRejectedEmail, sendEmail, type EmailResult } from "@/lib/server/email";
import type { AgencyApplication } from "@/types/admin";

/* Admin → Applications: approve (creates the agency, like Add agency) or reject. */

type Result<E extends string> = ActionResult<
  { application: AgencyApplication; feed?: "none" | "added" | "failed"; email?: EmailResult },
  "not_found" | "already_decided" | E
>;

/** `values` are the agency details the admin checked in the dialog (the application's data plus areas, status…). */
export async function approveApplicationAction(
  id: string,
  values: unknown
): Promise<Result<"validation_error" | "email_taken">> {
  await requireAdmin();
  const application = await findApplication(id);
  if (!application) return fail("not_found");
  if (application.status !== "pending") return fail("already_decided");

  const parsed = addAgencySchema.safeParse(values);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  // Developer accounts don't import XML feeds (that is the agency network's feed): never add one for them,
  // whatever the dialog sent. The URL they gave stays on the application.
  const agencyValues = application.accountType === "developer" ? { ...parsed.data, feedUrl: "" } : parsed.data;

  // The register form details go onto the agency straight from the stored application
  const created = await createAgency(agencyValues, registrationForAgency(application));
  if (!created.ok) return fail(created.error);

  const saved = await collections.applications.findOneAndUpdate(
    { _id: application._id, status: "pending" },
    { $set: { status: "approved", decidedAt: new Date(), agencyId: created.id } },
    { returnDocument: "after" }
  );
  if (!saved) return fail("already_decided");
  return ok({ application: toApplication(saved), feed: created.feed, email: created.email });
}

/** The reason is optional; it goes into the rejection email to the applicant. */
export async function rejectApplicationAction(id: string, input: unknown): Promise<Result<"validation_error">> {
  await requireAdmin();
  const parsed = rejectApplicationSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  const application = await findApplication(id);
  if (!application) return fail("not_found");

  const saved = await collections.applications.findOneAndUpdate(
    { _id: application._id, status: "pending" },
    { $set: { status: "rejected", decidedAt: new Date(), rejectReason: parsed.data.reason || null } },
    { returnDocument: "after" }
  );
  if (!saved) return fail("already_decided");
  const email = await sendEmail(applicationRejectedEmail({ to: saved.email, agencyName: saved.agencyName, reason: saved.rejectReason ?? "" }));
  return ok({ application: toApplication(saved), email });
}
