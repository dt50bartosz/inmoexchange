// app/[locale]/panel/mi-agencia/server/actions.ts
"use server";

import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { profileUpdate, toAgencyProfile } from "@/lib/server/agency-profile";
import { publicImageUrl } from "@/lib/server/r2";
import { deleteKeys, inspectUpload, moveObject } from "@/lib/server/storage";
import { LOGOS_PREFIX, PENDING_PREFIX, extensionFor } from "@/lib/images/config";
import { agencySchema, type Agency } from "@/lib/schemas/agency";

/*
 * Actions for "Mi agencia". The agency always comes from getAgencyId() on the server, never from the browser.
 */

/** The current agency as an ObjectId, or null while there is no real agency yet (the dev mock). */
async function agencyObjectId() {
  const id = await getAgencyId();
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function getAgencyProfile(): Promise<ActionResult<Agency, "not_found">> {
  const _id = await agencyObjectId();
  const doc = _id && (await collections.agencies.findOne({ _id }));
  return doc ? ok(toAgencyProfile(doc)) : fail("not_found");
}

/**
 * Saves the profile. `logo`: undefined = unchanged, null = remove it,
 * { key } = a new logo the browser just uploaded to this agency's pending folder.
 */
export async function saveAgencyProfile(
  input: unknown,
  logo?: { key: string } | null
): Promise<ActionResult<Agency, "not_found" | "validation_error" | "logo_failed">> {
  const _id = await agencyObjectId();
  const current = _id && (await collections.agencies.findOne({ _id }));
  if (!_id || !current) return fail("not_found");

  const parsed = agencySchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  const $set: Record<string, unknown> = { ...profileUpdate(parsed.data), updatedAt: new Date() };
  const oldKey = current.logoKey ?? null;

  if (logo === null) {
    Object.assign($set, { logo: null, logoKey: null });
  } else if (logo) {
    // Only files in this agency's own pending folder, and really a JPEG/WebP
    const agencyId = _id.toHexString();
    if (typeof logo.key !== "string" || !logo.key.startsWith(`${PENDING_PREFIX}/${agencyId}/`)) return fail("logo_failed");
    const check = await inspectUpload(logo.key);
    if (!check.ok) return fail("logo_failed");
    const key = `${LOGOS_PREFIX}/${agencyId}/${randomUUID()}.${extensionFor(check.contentType)}`;
    try {
      await moveObject(logo.key, key, check.contentType);
    } catch (err) {
      console.error("[mi-agencia] logo move failed", err);
      return fail("logo_failed");
    }
    Object.assign($set, { logo: publicImageUrl(key), logoKey: key });
  }

  const saved = await collections.agencies.findOneAndUpdate({ _id }, { $set }, { returnDocument: "after" });
  if (!saved) return fail("not_found");

  // The old logo file is no longer used
  if (logo !== undefined && oldKey) await deleteKeys([oldKey]).catch(() => {});
  return ok(toAgencyProfile(saved));
}
