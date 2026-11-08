// app/[locale]/admin/promotores/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { createDeveloper, findDeveloperDoc } from "@/lib/server/admin/developers";
import { deleteAgencyAction } from "@/app/[locale]/admin/agencies/[id]/server/actions";
import { adminActor, recordActivity } from "@/lib/server/project-activity";
import {
  deleteProject,
  findProjectDoc,
  saveProject,
  setDevelopmentVisibility,
  type ProjectWriter,
  type SaveProjectResult,
  type SetVisibilityResult,
} from "@/lib/server/developer/developments";
import { developmentVisibilitySchema } from "@/lib/schemas/developments";
import { createProjectWithUnits } from "@/lib/server/developer/units";
import { adminPendingFolder } from "@/lib/images/config";
import {
  convertToDeveloperSchema,
  developerContactSchema,
  developerNoteSchema,
  developerProfileSchema,
  manualUpdateSchema,
  newDeveloperSchema,
} from "@/lib/schemas/developers";
import type { EmailResult } from "@/lib/server/email";
import { saveDeveloperProfile, type SaveProfileResult } from "@/lib/server/developer/profile";
import { changeLoginEmail, convertDeveloperToAgency, registrationCountOf, setDeveloperStatus, signOutEverywhere } from "@/lib/server/admin/developer-accounts";

/*
 * Admin → Developer CRM. Every action checks the admin first and validates its input again.
 * Project saves go through lib/server/developer/developments.ts, which also writes the update history.
 */

async function adminWriter(): Promise<ProjectWriter & { admin: { id: string; email: string } }> {
  const admin = await requireAdmin();
  return { admin, source: "admin", actor: adminActor(admin), pendingFolder: adminPendingFolder(admin.id) };
}

/* ---------- Developers ---------- */

export async function createDeveloperAction(
  input: unknown
): Promise<ActionResult<{ id: string; email: EmailResult | "not_sent" }, "validation_error" | "email_taken">> {
  await requireAdmin();
  const parsed = newDeveloperSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const result = await createDeveloper(parsed.data);
  return result.ok ? ok({ id: result.id, email: result.email }) : fail(result.error);
}

/**
 * Marks an existing agency account as a developer. Its properties and feeds stay as they are; its login becomes
 * a developer login (role "developer") and its open sessions end, so it signs in again into /promotor.
 */
export async function convertToDeveloperAction(input: unknown): Promise<ActionResult<{ id: string }, "validation_error" | "not_found">> {
  await requireAdmin();
  const parsed = convertToDeveloperSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const res = await collections.agencies.updateOne(
    { _id: new ObjectId(parsed.data.agencyId), accountType: { $ne: "developer" } },
    { $set: { accountType: "developer", updatedAt: new Date() } }
  );
  if (!res.matchedCount) return fail("not_found");
  await collections.users.updateMany(
    { agencyId: parsed.data.agencyId, role: { $ne: "admin" } },
    { $set: { role: "developer", updatedAt: new Date() }, $inc: { sessionVersion: 1 } }
  );
  return ok({ id: parsed.data.agencyId });
}

/**
 * Saves the company details through the same helper as the developer's own profile page
 * (lib/server/developer/profile.ts), plus the CRM's relationship manager.
 * `logo`: undefined = unchanged, null = remove it, { key } = a new logo the admin just uploaded (admin pending folder).
 */
export async function updateDeveloperAction(
  id: string,
  input: unknown,
  logo?: { key: string } | null
): Promise<SaveProfileResult> {
  const admin = await requireAdmin();
  const parsed = developerProfileSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const { relationshipManagerId } = parsed.data;

  if (relationshipManagerId) {
    const manager = await collections.users.findOne({ _id: new ObjectId(relationshipManagerId), role: "admin" }, { projection: { _id: 1 } });
    if (!manager) return fail("validation_error", { relationshipManagerId: "required" });
  }

  return saveDeveloperProfile(id, input, logo, { role: "admin", userId: admin.id, pendingFolder: adminPendingFolder(admin.id) }, {
    relationshipManagerId: relationshipManagerId || null,
  });
}

/**
 * Back to a plain agency account: the organisation and its login both become "agency" (they must match, or the
 * login is refused) and open sessions end. Projects, units, registrations and history are kept for if it comes back.
 */
export async function removeFromCrmAction(id: string): Promise<ActionResult<null, "not_found">> {
  return convertDeveloperToAgency(id);
}

/**
 * Delete = cancel when agencies have registered clients with this developer (their records must survive):
 * the account is set to "cancelled" instead. Without registrations it is deleted permanently, like an agency.
 */
export async function deleteDeveloperAction(id: string): Promise<ActionResult<{ cancelled: boolean }, "not_found">> {
  await requireAdmin();
  if (!(await findDeveloperDoc(id))) return fail("not_found");
  if ((await registrationCountOf(id)) > 0) {
    const res = await setDeveloperStatus(id, "cancelled");
    return res.ok ? ok({ cancelled: true }) : fail("not_found");
  }
  const res = await deleteAgencyAction(id);
  return res.ok ? ok({ cancelled: false }) : res;
}

/** Account tab → status: active / suspended / cancelled. */
export async function setDeveloperStatusAction(id: string, status: unknown): Promise<ActionResult<null, "not_found" | "validation_error">> {
  return setDeveloperStatus(id, status);
}

/** Account tab → change the login email (ends open sessions). */
export async function changeLoginEmailAction(id: string, input: unknown): Promise<ActionResult<{ email: string }, "not_found" | "validation_error" | "email_taken">> {
  return changeLoginEmail(id, input);
}

/** Account tab → sign out everywhere. */
export async function signOutEverywhereAction(id: string): Promise<ActionResult<null, "not_found">> {
  return signOutEverywhere(id);
}

/* ---------- Projects ---------- */

/** `units`: the rows of the units table on "New development" (optional; checked before anything is saved). */
export async function createProjectAction(developerId: string, input: unknown, units: unknown = []): Promise<SaveProjectResult> {
  const writer = await adminWriter();
  const developer = await findDeveloperDoc(developerId);
  if (!developer) return fail("not_found");
  return createProjectWithUnits({ id: developerId, name: developer.name }, input, units, writer);
}

export async function updateProjectAction(projectId: string, input: unknown): Promise<SaveProjectResult> {
  const writer = await adminWriter();
  const project = await findProjectDoc(projectId);
  const developer = project && (await findDeveloperDoc(project.developerId));
  if (!project || !developer) return fail("not_found");
  return saveProject({ id: project.developerId, name: developer.name }, project, input, writer);
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult<{ developerId: string }, "not_found">> {
  const writer = await adminWriter();
  const project = await findProjectDoc(projectId);
  if (!project) return fail("not_found");
  await deleteProject(project, writer);
  await collections.developerNotes.deleteMany({ projectId });
  return ok({ developerId: project.developerId });
}

/**
 * Publish / back to draft on the developer's behalf (same rules as the developer: publishing needs collaboration
 * terms, a photo and a description). The development must belong to the developer in the URL.
 */
export async function setProjectVisibilityAction(
  developerId: string,
  projectId: string,
  visibility: unknown
): Promise<SetVisibilityResult | ActionResult<never, "validation_error">> {
  const writer = await adminWriter();
  const parsed = developmentVisibilitySchema.safeParse(visibility);
  if (!parsed.success) return fail("validation_error");
  const developer = await findDeveloperDoc(developerId);
  const project = developer && (await findProjectDoc(projectId, developerId));
  if (!developer || !project) return fail("not_found");
  return setDevelopmentVisibility({ id: developerId, name: developer.name }, project, parsed.data, writer);
}

/** A manual entry in the project's update history (permanent). */
export async function addManualUpdateAction(projectId: string, input: unknown): Promise<ActionResult<null, "validation_error" | "not_found">> {
  const writer = await adminWriter();
  const parsed = manualUpdateSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const project = await findProjectDoc(projectId);
  if (!project) return fail("not_found");
  await recordActivity(
    { developerId: project.developerId, projectId, projectName: project.name, source: "admin", actor: writer.actor },
    [{ type: "note", description: parsed.data.description }]
  );
  return ok(null);
}

/* ---------- Contacts ---------- */

export async function saveContactAction(
  developerId: string,
  contactId: string | null,
  input: unknown
): Promise<ActionResult<null, "validation_error" | "not_found">> {
  await requireAdmin();
  if (!(await findDeveloperDoc(developerId))) return fail("not_found");
  const parsed = developerContactSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const now = new Date();
  if (contactId) {
    if (!ObjectId.isValid(contactId)) return fail("not_found");
    const res = await collections.developerContacts.updateOne({ _id: new ObjectId(contactId), developerId }, { $set: { ...parsed.data, updatedAt: now } });
    return res.matchedCount ? ok(null) : fail("not_found");
  }
  await collections.developerContacts.insertOne({ _id: new ObjectId(), developerId, ...parsed.data, createdAt: now, updatedAt: now });
  return ok(null);
}

export async function deleteContactAction(developerId: string, contactId: string): Promise<ActionResult<null, "not_found">> {
  await requireAdmin();
  if (!ObjectId.isValid(contactId)) return fail("not_found");
  const res = await collections.developerContacts.deleteOne({ _id: new ObjectId(contactId), developerId });
  return res.deletedCount ? ok(null) : fail("not_found");
}

/* ---------- Internal notes ---------- */

export async function saveNoteAction(
  developerId: string,
  noteId: string | null,
  input: unknown
): Promise<ActionResult<null, "validation_error" | "not_found">> {
  const admin = await requireAdmin();
  if (!(await findDeveloperDoc(developerId))) return fail("not_found");
  const parsed = developerNoteSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const projectId = parsed.data.projectId || null;
  if (projectId && !(await findProjectDoc(projectId, developerId))) return fail("validation_error", { projectId: "required" });

  const now = new Date();
  if (noteId) {
    if (!ObjectId.isValid(noteId)) return fail("not_found");
    const res = await collections.developerNotes.updateOne({ _id: new ObjectId(noteId), developerId }, { $set: { body: parsed.data.body, projectId, updatedAt: now } });
    return res.matchedCount ? ok(null) : fail("not_found");
  }
  await collections.developerNotes.insertOne({
    _id: new ObjectId(),
    developerId,
    projectId,
    body: parsed.data.body,
    author: { userId: admin.id, email: admin.email },
    createdAt: now,
    updatedAt: now,
  });
  return ok(null);
}

export async function deleteNoteAction(developerId: string, noteId: string): Promise<ActionResult<null, "not_found">> {
  await requireAdmin();
  if (!ObjectId.isValid(noteId)) return fail("not_found");
  const res = await collections.developerNotes.deleteOne({ _id: new ObjectId(noteId), developerId });
  return res.deletedCount ? ok(null) : fail("not_found");
}
