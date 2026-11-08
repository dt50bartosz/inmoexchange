// lib/server/developer/registrations.ts
// Client registrations: an agency registers a buyer for a published development; the developer accepts or rejects it.
// The first accepted registration protects that agency for that buyer for the development's protectionDays.
// Callers check who is acting (requireRole); every query here is scoped again by agencyId or developerId.
import "server-only";
import { ObjectId, type Filter } from "mongodb";
import { collections, ensureIndexes } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { DEFAULT_PROTECTION_DAYS, type RegistrationStatus } from "@/lib/constants/developers";
import { clientRegistrationSchema, registrationDecisionSchema } from "@/lib/schemas/client-registrations";
import type { AuditStamp, ClientRegistrationDoc, DeveloperRegistration } from "@/types/developers";

const DAY = 24 * 60 * 60 * 1000;

/**
 * How the same buyer is recognised: "p:" + phone digits (00 prefix dropped, a 9-digit Spanish number gets 34),
 * "e:" + email in lower case. Two registrations are the same buyer when they share any key.
 */
export function buyerKeysOf(phone: string, email: string): string[] {
  const keys: string[] = [];
  let digits = phone.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length === 9) digits = `34${digits}`;
  if (digits.length >= 6) keys.push(`p:${digits}`);
  const mail = email.trim().toLowerCase();
  if (mail) keys.push(`e:${mail}`);
  return keys;
}

/** An accepted registration that still protects its agency, for any of these keys, in this development. */
const activeProtection = (developmentId: string, keys: string[], now: Date): Filter<ClientRegistrationDoc> => ({
  developmentId,
  buyerKeys: { $in: keys },
  status: "accepted",
  protectedUntil: { $gt: now },
});

/** What the developer gets: never the buyer's phone, email or keys. */
export function toDeveloperRegistration(d: ClientRegistrationDoc, now = Date.now()): DeveloperRegistration {
  return {
    id: d._id.toHexString(),
    developmentId: d.developmentId,
    developmentName: d.developmentName,
    agencyName: d.agencyName,
    buyerName: d.buyer.name,
    notes: d.notes,
    status: d.status,
    protectedUntil: d.protectedUntil?.toISOString() ?? null,
    protectionActive: d.status === "accepted" && !!d.protectedUntil && d.protectedUntil.getTime() > now,
    reason: d.reason,
    createdAt: d.createdAt.toISOString(),
    decidedAt: d.decidedAt?.toISOString() ?? null,
  };
}

/** The projection for every developer-side read: the contact details never leave the database. */
const DEVELOPER_PROJECTION = { "buyer.phone": 0, "buyer.email": 0, buyerKeys: 0 } as const;

export type CreateRegistrationResult = ActionResult<
  { id: string },
  "validation_error" | "not_found" | "already_protected" | "duplicate"
>;

/**
 * An agency registers a buyer. The development must be published and its developer active.
 * Refused when the buyer is already protected for another (or the same) agency, or this agency already has
 * a pending registration for the same buyer. The other agency's name is never revealed.
 */
export async function createRegistration(agency: { id: string; name: string }, userId: string, input: unknown): Promise<CreateRegistrationResult> {
  const parsed = clientRegistrationSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const v = parsed.data;

  const development = await collections.devProjects.findOne({ _id: new ObjectId(v.developmentId) });
  // Drafts (and old documents without a visibility are published) are never open to agencies
  if (!development || (development.visibility ?? "published") !== "published") return fail("not_found");
  const developer = await collections.agencies.findOne(
    { _id: new ObjectId(development.developerId), accountType: "developer" },
    { projection: { status: 1 } }
  );
  if (!developer || developer.status === "suspended" || developer.status === "cancelled") return fail("not_found");

  const keys = buyerKeysOf(v.buyerPhone, v.buyerEmail);
  if (!keys.length) return fail("validation_error", { buyerPhone: "phone_or_email" });
  const now = new Date();
  if (await collections.clientRegistrations.findOne(activeProtection(v.developmentId, keys, now), { projection: { _id: 1 } })) {
    return fail("already_protected");
  }
  const mine = await collections.clientRegistrations.findOne(
    { developmentId: v.developmentId, agencyId: agency.id, buyerKeys: { $in: keys }, status: "pending" },
    { projection: { _id: 1 } }
  );
  if (mine) return fail("duplicate");

  await ensureIndexes();
  const doc: ClientRegistrationDoc = {
    _id: new ObjectId(),
    developerId: development.developerId,
    developmentId: v.developmentId,
    developmentName: development.name,
    agencyId: agency.id,
    agencyName: agency.name,
    buyer: { name: v.buyerName, phone: v.buyerPhone, email: v.buyerEmail.toLowerCase() },
    buyerKeys: keys,
    notes: v.notes,
    status: "pending",
    protectedUntil: null,
    reason: "",
    createdBy: { userId },
    decidedBy: null,
    createdAt: now,
    decidedAt: null,
  };
  await collections.clientRegistrations.insertOne(doc);
  return ok({ id: doc._id.toHexString() });
}

/** The developer's registrations, newest first (pending ones first). Optional filters by status and development. */
export async function listDeveloperRegistrations(
  developerId: string,
  filter: { status?: RegistrationStatus; developmentId?: string; limit?: number } = {}
): Promise<DeveloperRegistration[]> {
  const docs = await collections.clientRegistrations
    .find(
      { developerId, ...(filter.status ? { status: filter.status } : {}), ...(filter.developmentId ? { developmentId: filter.developmentId } : {}) },
      { projection: DEVELOPER_PROJECTION }
    )
    .sort({ createdAt: -1 })
    .limit(filter.limit ?? 500)
    .toArray();
  const now = Date.now();
  const list = (docs as ClientRegistrationDoc[]).map((d) => toDeveloperRegistration(d, now));
  return list.sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
}

export async function registrationCounts(developerId: string): Promise<Record<RegistrationStatus, number>> {
  const rows = await collections.clientRegistrations
    .aggregate<{ _id: RegistrationStatus; n: number }>([{ $match: { developerId } }, { $group: { _id: "$status", n: { $sum: 1 } } }])
    .toArray();
  const counts = { pending: 0, accepted: 0, rejected: 0 };
  for (const r of rows) counts[r._id] = r.n;
  return counts;
}

export type DecideRegistrationResult = ActionResult<DeveloperRegistration, "validation_error" | "not_found" | "already_decided" | "already_protected">;

/**
 * The developer (or an admin on its behalf) accepts or rejects a pending registration of `developerId`.
 * Accepting protects the agency for the development's protectionDays and rejects the other pending registrations
 * of the same buyer in that development ("protected_other"). Accepting is refused while another agency is protected.
 */
export async function decideRegistration(developerId: string, registrationId: string, input: unknown, by: AuditStamp): Promise<DecideRegistrationResult> {
  const parsed = registrationDecisionSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  if (!ObjectId.isValid(registrationId)) return fail("not_found");
  const reg = await collections.clientRegistrations.findOne({ _id: new ObjectId(registrationId), developerId });
  if (!reg) return fail("not_found");
  if (reg.status !== "pending") return fail("already_decided");

  const now = new Date();
  if (parsed.data.decision === "reject") {
    const res = await collections.clientRegistrations.findOneAndUpdate(
      { _id: reg._id, developerId, status: "pending" },
      { $set: { status: "rejected", reason: parsed.data.reason, decidedBy: by, decidedAt: now } },
      { returnDocument: "after", projection: DEVELOPER_PROJECTION }
    );
    return res ? ok(toDeveloperRegistration(res as ClientRegistrationDoc)) : fail("already_decided");
  }

  if (await collections.clientRegistrations.findOne(activeProtection(reg.developmentId, reg.buyerKeys, now), { projection: { _id: 1 } })) {
    return fail("already_protected");
  }
  const development = await collections.devProjects.findOne({ _id: new ObjectId(reg.developmentId), developerId }, { projection: { protectionDays: 1 } });
  const days = development?.protectionDays ?? DEFAULT_PROTECTION_DAYS;
  const res = await collections.clientRegistrations.findOneAndUpdate(
    { _id: reg._id, developerId, status: "pending" },
    { $set: { status: "accepted", reason: parsed.data.reason, protectedUntil: new Date(now.getTime() + days * DAY), decidedBy: by, decidedAt: now } },
    { returnDocument: "after", projection: DEVELOPER_PROJECTION }
  );
  if (!res) return fail("already_decided");

  // The same buyer, waiting from other agencies (or the same one): no longer possible
  await collections.clientRegistrations.updateMany(
    { developmentId: reg.developmentId, developerId, buyerKeys: { $in: reg.buyerKeys }, status: "pending", _id: { $ne: reg._id } },
    { $set: { status: "rejected", reason: "protected_other", decidedBy: { role: "system", userId: null }, decidedAt: now } }
  );
  return ok(toDeveloperRegistration(res as ClientRegistrationDoc));
}
