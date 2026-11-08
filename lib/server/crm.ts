// lib/server/crm.ts
// Helpers for the CRM server actions.
import "server-only";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { idSchema, type ContactValues } from "@/lib/schemas/crm";
import type { Contact, ContactDoc, NoteDoc } from "@/types/crm";

/** Filter: this agency's buyers that aren't deleted (optionally one buyer). */
export function scoped(agencyId: string, _id?: ObjectId) {
  return { agencyId, deletedAt: { $exists: false }, ...(_id ? { _id } : {}) };
}

/** Finds one of the current agency's buyers by id, or null. */
export async function findContact(id: unknown) {
  if (!idSchema.safeParse(id).success) return null;
  const agencyId = await getAgencyId();
  return collections.crmContacts.findOne(scoped(agencyId, new ObjectId(id as string)));
}

/** Validated form values → database fields (text date becomes a Date). */
export function toFields({ lastContactAt, ...rest }: ContactValues) {
  return { ...rest, lastContactAt: lastContactAt ? new Date(lastContactAt) : undefined };
}

/** Splits fields into $set (has a value) and $unset (cleared), for updateOne. */
export function toUpdate(fields: Record<string, unknown>) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) $unset[key] = "";
    else $set[key] = value;
  }
  return Object.keys($unset).length ? { $set, $unset } : { $set };
}

/** Removes keys whose value is undefined, so they aren't stored. */
export function withoutUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

export function newNote(kind: NoteDoc["kind"], body: string): NoteDoc {
  return { id: new ObjectId().toHexString(), kind, body, createdAt: new Date() };
}

/** Database document → the plain object the browser uses. */
export function toContact(d: ContactDoc): Contact {
  return {
    id: d._id.toHexString(),
    name: d.name,
    email: d.email,
    phone: d.phone,
    language: d.language,
    source: d.source,
    budgetMin: d.budgetMin,
    budgetMax: d.budgetMax,
    areas: d.areas ?? [],
    propertyTypes: d.propertyTypes ?? [],
    bedroomsMin: d.bedroomsMin,
    stage: d.stage,
    createdAt: d.createdAt.toISOString(),
    lastContactAt: d.lastContactAt?.toISOString(),
    nextFollowUpAt: d.nextFollowUpAt,
    arrivalDate: d.arrivalDate,
    notes: (d.notes ?? []).map((n) => ({ id: n.id, kind: n.kind, body: n.body, createdAt: n.createdAt.toISOString() })),
  };
}