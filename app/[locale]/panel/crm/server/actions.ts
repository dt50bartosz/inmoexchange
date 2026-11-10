// app/[locale]/panel/crm/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { collections, ensureIndexes } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { findContact, newNote, scoped, toContact, toFields, toUpdate, withoutUndefined } from "@/lib/server/crm";
import { contactSchema, contactWithPhoneSchema, noteSchema, stageSchema } from "@/lib/schemas/crm";
import { STAGE_LABEL, type Contact, type ContactDoc } from "@/types/crm";

/*
 * CRM actions.
 * The agency always comes from getAgencyId() on the server, never from the browser.
 * Every write returns the saved buyer, so the page can show exactly what's in the database.
 */

export type CrmResult<T = Contact> = ActionResult<T>;

const col = collections.crmContacts;

/** All of the agency's buyers, newest first. */
export async function getContacts(): Promise<CrmResult<Contact[]>> {
  const agencyId = await getAgencyId();
  await ensureIndexes();
  const docs = await col.find(scoped(agencyId)).sort({ createdAt: -1 }).toArray();
  return ok(docs.map(toContact));
}

export async function createContact(input: unknown): Promise<CrmResult> {
  const parsed = contactWithPhoneSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  const now = new Date();
  const doc: ContactDoc = withoutUndefined({
    _id: new ObjectId(),
    agencyId: await getAgencyId(),
    ...toFields(parsed.data),
    notes: [],
    createdAt: now,
    updatedAt: now,
  });

  await col.insertOne(doc);
  return ok(toContact(doc));
}

/** `changes` can be any subset of the buyer's fields; the result is checked as a whole. */
export async function updateContact(id: string, changes: unknown): Promise<CrmResult> {
  const current = await findContact(id);
  if (!current) return fail("not_found");

  // A saved phone can't be removed. Older buyers without one can still get quick
  // updates (follow-up date etc.); the edit form asks them for a phone.
  const before = toContact(current);
  const schema = before.phone ? contactWithPhoneSchema : contactSchema;
  const parsed = schema.safeParse({ ...before, ...(changes as object) });
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  const update = toUpdate({ ...toFields(parsed.data), updatedAt: new Date() });
  const saved = await col.findOneAndUpdate(scoped(current.agencyId, current._id), update, { returnDocument: "after" });
  return saved ? ok(toContact(saved)) : fail("not_found");
}

export async function moveStage(id: string, stage: string): Promise<CrmResult> {
  const current = await findContact(id);
  if (!current) return fail("not_found");

  const to = stageSchema.safeParse(stage);
  if (!to.success) return fail("validation_error", { stage: "Invalid stage" });
  if (current.stage === to.data) return ok(toContact(current));

  const saved = await col.findOneAndUpdate(
    scoped(current.agencyId, current._id),
    {
      $set: { stage: to.data, updatedAt: new Date() },
      $push: { notes: { $each: [newNote("stage", `Moved to ${STAGE_LABEL[to.data]}`)], $position: 0 } },
    },
    { returnDocument: "after" }
  );
  return saved ? ok(toContact(saved)) : fail("not_found");
}

export async function addNote(id: string, body: string): Promise<CrmResult> {
  const current = await findContact(id);
  if (!current) return fail("not_found");

  const text = noteSchema.safeParse(body);
  if (!text.success) return fail("validation_error", { note: text.error.issues[0].message });

  const saved = await col.findOneAndUpdate(
    scoped(current.agencyId, current._id),
    {
      $set: { updatedAt: new Date() },
      $push: { notes: { $each: [newNote("note", text.data)], $position: 0 } },
    },
    { returnDocument: "after" }
  );
  return saved ? ok(toContact(saved)) : fail("not_found");
}

/** Soft delete: hidden from the panel, kept in the database. */
export async function deleteContact(id: string): Promise<CrmResult<null>> {
  const current = await findContact(id);
  if (!current) return fail("not_found");

  const now = new Date();
  await col.updateOne(scoped(current.agencyId, current._id), { $set: { deletedAt: now, updatedAt: now } });
  return ok(null);
}