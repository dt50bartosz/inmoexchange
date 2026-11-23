// app/[locale]/admin/agencies/[id]/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { collections } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { sendLoginDetails } from "@/lib/server/admin/agencies";
import { orgFromDoc, recordAdminEvent } from "@/lib/server/platform-events";
import { registrationCountOf, setDeveloperStatus } from "@/lib/server/admin/developer-accounts";
import type { EmailResult } from "@/lib/server/email";
import { deletePrefix } from "@/lib/server/storage";
import { LOGOS_PREFIX, PENDING_PREFIX, PROJECTS_PREFIX, PROPERTIES_PREFIX } from "@/lib/images/config";
import { AGENCY_STATUSES } from "@/lib/constants/admin";

/* Admin → Agencies → one agency: suspend / reactivate, delete. */

async function findAgency(id: unknown) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  return collections.agencies.findOne({ _id: new ObjectId(id) });
}

/** "Send login details": a new temporary password, emailed to the agency's login email. */
export async function sendLoginDetailsAction(id: string): Promise<ActionResult<EmailResult, "not_found">> {
  const admin = await requireAdmin();
  const agency = await findAgency(id);
  if (!agency) return fail("not_found");
  const result = await sendLoginDetails(agency._id.toHexString());
  if (result) await recordAdminEvent(admin, "login_details_sent", orgFromDoc(agency), "New temporary password emailed");
  return result ? ok(result) : fail("not_found");
}

/** Changes the platform status. A suspended agency's properties disappear from the network and exports. */
export async function setAgencyStatusAction(
  id: string,
  status: unknown
): Promise<ActionResult<null, "not_found" | "validation_error">> {
  const admin = await requireAdmin();
  const parsed = z.enum(AGENCY_STATUSES).safeParse(status);
  if (!parsed.success) return fail("validation_error", { status: "Invalid status" });

  const agency = await findAgency(id);
  if (!agency) return fail("not_found");

  await collections.agencies.updateOne({ _id: agency._id }, { $set: { status: parsed.data, updatedAt: new Date() } });
  if ((agency.status ?? "active") !== parsed.data)
    await recordAdminEvent(admin, "status_changed", orgFromDoc(agency), `Status: ${agency.status ?? "active"} → ${parsed.data}`);
  return ok(null);
}

/**
 * Permanently deletes the agency and everything that belongs to it:
 * properties (and their photos in R2), feeds, CRM buyers, XML export links and its login,
 * and for developers their projects, contacts and notes.
 * TODO: also client microsites once they're built.
 */
export async function deleteAgencyAction(id: string): Promise<ActionResult<null, "not_found">> {
  const admin = await requireAdmin();
  const agency = await findAgency(id);
  if (!agency) return fail("not_found");
  const agencyId = agency._id.toHexString();

  await Promise.all([
    collections.properties.deleteMany({ agencyId }),
    collections.feeds.deleteMany({ agencyId }),
    collections.crmContacts.deleteMany({ agencyId }),
    collections.xmlExports.deleteMany({ agencyId }),
    // Only the agency's own logins: an admin login is never deleted with an agency (one linked by mistake once took
    // the admin's own access with it, 2026-11-23)
    collections.users.deleteMany({ agencyId, role: { $ne: "admin" } }),
    collections.clientPages.deleteMany({ agencyId }),
    collections.propertyEvents.deleteMany({ $or: [{ ownerAgencyId: agencyId }, { viewerAgencyId: agencyId }] }),
    // Developer CRM data. The project history (project_activity) is kept on purpose: it is the permanent audit trail.
    collections.devProjects.deleteMany({ developerId: agencyId }),
    collections.devUnits.deleteMany({ developerId: agencyId }),
    collections.developerContacts.deleteMany({ developerId: agencyId }),
    collections.developerNotes.deleteMany({ developerId: agencyId }),
  ]);
  await collections.agencies.deleteOne({ _id: agency._id });
  await recordAdminEvent(admin, "account_deleted", orgFromDoc(agency), "Account and all its data deleted permanently");

  // Photos last: a failure here never leaves data without its photos
  await Promise.all([
    deletePrefix(`${PROPERTIES_PREFIX}/${agencyId}/`),
    deletePrefix(`${PENDING_PREFIX}/${agencyId}/`),
    deletePrefix(`${LOGOS_PREFIX}/${agencyId}/`),
    deletePrefix(`${PROJECTS_PREFIX}/${agencyId}/`),
  ]).catch((e) => console.error("deleteAgencyAction: photo cleanup failed", e));

  return ok(null);
}

/**
 * Agencies list → "Delete selected". Same as deleting each one in turn (deleteAgencyAction), except a developer
 * account with client registrations by agencies is cancelled instead, as on Promotores (their records must survive).
 */
export async function deleteAgenciesAction(ids: unknown): Promise<ActionResult<{ deleted: number; cancelled: number; missing: number }, "validation_error">> {
  await requireAdmin();
  const parsed = z.array(z.string().refine((id) => ObjectId.isValid(id))).min(1).max(1000).safeParse(ids);
  if (!parsed.success) return fail("validation_error");

  let deleted = 0;
  let cancelled = 0;
  let missing = 0;
  for (const id of new Set(parsed.data)) {
    const agency = await findAgency(id);
    if (!agency) {
      missing++;
      continue;
    }
    if (agency.accountType === "developer" && (await registrationCountOf(id)) > 0) {
      const res = await setDeveloperStatus(id, "cancelled");
      if (res.ok) cancelled++;
      else missing++;
      continue;
    }
    const res = await deleteAgencyAction(id);
    if (res.ok) deleted++;
    else missing++;
  }
  return ok({ deleted, cancelled, missing });
}
