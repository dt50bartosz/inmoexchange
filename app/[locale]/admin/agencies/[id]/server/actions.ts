// app/[locale]/admin/agencies/[id]/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { collections } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { sendLoginDetails } from "@/lib/server/admin/agencies";
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
  await requireAdmin();
  const agency = await findAgency(id);
  if (!agency) return fail("not_found");
  const result = await sendLoginDetails(agency._id.toHexString());
  return result ? ok(result) : fail("not_found");
}

/** Changes the platform status. A suspended agency's properties disappear from the network and exports. */
export async function setAgencyStatusAction(
  id: string,
  status: unknown
): Promise<ActionResult<null, "not_found" | "validation_error">> {
  await requireAdmin();
  const parsed = z.enum(AGENCY_STATUSES).safeParse(status);
  if (!parsed.success) return fail("validation_error", { status: "Invalid status" });

  const agency = await findAgency(id);
  if (!agency) return fail("not_found");

  await collections.agencies.updateOne({ _id: agency._id }, { $set: { status: parsed.data, updatedAt: new Date() } });
  return ok(null);
}

/**
 * Permanently deletes the agency and everything that belongs to it:
 * properties (and their photos in R2), feeds, CRM buyers, XML export links and its login,
 * and for developers their projects, contacts and notes.
 * TODO: also client microsites once they're built.
 */
export async function deleteAgencyAction(id: string): Promise<ActionResult<null, "not_found">> {
  await requireAdmin();
  const agency = await findAgency(id);
  if (!agency) return fail("not_found");
  const agencyId = agency._id.toHexString();

  await Promise.all([
    collections.properties.deleteMany({ agencyId }),
    collections.feeds.deleteMany({ agencyId }),
    collections.crmContacts.deleteMany({ agencyId }),
    collections.xmlExports.deleteMany({ agencyId }),
    collections.users.deleteMany({ agencyId }),
    collections.clientPages.deleteMany({ agencyId }),
    collections.propertyEvents.deleteMany({ $or: [{ ownerAgencyId: agencyId }, { viewerAgencyId: agencyId }] }),
    // Developer CRM data. The project history (project_activity) is kept on purpose: it is the permanent audit trail.
    collections.devProjects.deleteMany({ developerId: agencyId }),
    collections.devUnits.deleteMany({ developerId: agencyId }),
    collections.developerContacts.deleteMany({ developerId: agencyId }),
    collections.developerNotes.deleteMany({ developerId: agencyId }),
  ]);
  await collections.agencies.deleteOne({ _id: agency._id });

  // Photos last: a failure here never leaves data without its photos
  await Promise.all([
    deletePrefix(`${PROPERTIES_PREFIX}/${agencyId}/`),
    deletePrefix(`${PENDING_PREFIX}/${agencyId}/`),
    deletePrefix(`${LOGOS_PREFIX}/${agencyId}/`),
    deletePrefix(`${PROJECTS_PREFIX}/${agencyId}/`),
  ]).catch((e) => console.error("deleteAgencyAction: photo cleanup failed", e));

  return ok(null);
}
