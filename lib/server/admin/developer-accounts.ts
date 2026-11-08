// lib/server/admin/developer-accounts.ts
// Admin → Promotores → one developer → Account: login email, sign out everywhere, status, convert, delete.
// A developer is an agencies doc with accountType "developer" and its login(s) have users.role "developer";
// these helpers keep the two in step (lib/server/auth/require-role.ts refuses a mismatch).
import "server-only";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { collections } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { RE, V } from "@/lib/schemas/shared";
import { requireAdmin } from "./current-admin";
import { findDeveloperDoc } from "./developers";

export const DEVELOPER_ACCOUNT_STATUSES = ["active", "suspended", "cancelled"] as const;
export type DeveloperAccountStatus = (typeof DEVELOPER_ACCOUNT_STATUSES)[number];

/** Every login of the account (one today). Admin logins never belong to an organisation, but stay safe anyway. */
const loginsOf = (developerId: string) => ({ agencyId: developerId, role: { $ne: "admin" as const } });

/**
 * Active: can log in, published developments visible to agencies.
 * Suspended / cancelled: no login (requireRole checks it on every request), developments hidden from agencies.
 * Nothing is deleted.
 */
export async function setDeveloperStatus(id: string, status: unknown): Promise<ActionResult<null, "not_found" | "validation_error">> {
  await requireAdmin();
  const parsed = z.enum(DEVELOPER_ACCOUNT_STATUSES).safeParse(status);
  if (!parsed.success) return fail("validation_error");
  const dev = await findDeveloperDoc(id);
  if (!dev) return fail("not_found");
  await collections.agencies.updateOne({ _id: dev._id }, { $set: { status: parsed.data, updatedAt: new Date() } });
  return ok(null);
}

const emailSchema = z.object({ email: z.string().trim().toLowerCase().min(1, V.required).regex(RE.email, V.email) });

/** The login email (and the account's copy of it). Ends open sessions: the developer logs in again with the new email. */
export async function changeLoginEmail(id: string, input: unknown): Promise<ActionResult<{ email: string }, "not_found" | "validation_error" | "email_taken">> {
  await requireAdmin();
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const { email } = parsed.data;
  const dev = await findDeveloperDoc(id);
  if (!dev) return fail("not_found");
  const user = await collections.users.findOne(loginsOf(id));
  if (!user) return fail("not_found");
  if (user.email === email) return ok({ email });
  if (await collections.users.findOne({ email, _id: { $ne: user._id } }, { projection: { _id: 1 } })) return fail("email_taken");
  try {
    await collections.users.updateOne({ _id: user._id }, { $set: { email, updatedAt: new Date() }, $inc: { sessionVersion: 1 } });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return fail("email_taken");
    throw error;
  }
  await collections.agencies.updateOne({ _id: dev._id }, { $set: { email, updatedAt: new Date() } });
  return ok({ email });
}

/** Ends every open session of the account (e.g. a lost phone). The password stays the same. */
export async function signOutEverywhere(id: string): Promise<ActionResult<null, "not_found">> {
  await requireAdmin();
  const dev = await findDeveloperDoc(id);
  if (!dev) return fail("not_found");
  await collections.users.updateMany(loginsOf(id), { $inc: { sessionVersion: 1 }, $set: { updatedAt: new Date() } });
  return ok(null);
}

/**
 * Back to a regular agency account: the organisation and its login(s) both change, and open sessions end,
 * so the next login opens /panel. Developments, units, registrations and history are kept for if it comes back.
 */
export async function convertDeveloperToAgency(id: string): Promise<ActionResult<null, "not_found">> {
  await requireAdmin();
  const dev = await findDeveloperDoc(id);
  if (!dev) return fail("not_found");
  await collections.agencies.updateOne({ _id: dev._id }, { $set: { accountType: "agency", updatedAt: new Date() } });
  await collections.users.updateMany(loginsOf(id), { $set: { role: "agency", updatedAt: new Date() }, $inc: { sessionVersion: 1 } });
  return ok(null);
}

/** How many client registrations the developer has: with any, "delete" only cancels (agencies' records must survive). */
export async function registrationCountOf(id: string): Promise<number> {
  return ObjectId.isValid(id) ? collections.clientRegistrations.countDocuments({ developerId: id }) : 0;
}
