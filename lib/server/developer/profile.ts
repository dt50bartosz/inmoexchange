// lib/server/developer/profile.ts
// The developer's company profile: read and saved here for both the developer panel (/promotor/perfil)
// and the admin on the developer's behalf, so both go through the same validation, logo handling and audit.
import "server-only";
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { publicImageUrl } from "@/lib/server/r2";
import { deleteKeys, inspectUpload, moveObject } from "@/lib/server/storage";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { LOGOS_PREFIX, extensionFor } from "@/lib/images/config";
import { companyProfileSchema, type CompanyProfileValues } from "@/lib/schemas/developer-profile";
import type { AgencyDoc } from "@/types/models";

/** Who is saving: the developer itself or an admin. `pendingFolder`: the only place a new logo may come from. */
export type ProfileWriter = { role: "developer" | "admin"; userId: string; pendingFolder: string };

/** undefined = logo unchanged, null = remove it, { key } = a new logo just uploaded to the writer's pending folder. */
export type LogoChange = { key: string } | null | undefined;

export type DeveloperProfileView = {
  values: CompanyProfileValues;
  logo: string | null;
  /** Last save; role "admin" = edited by Colabora MLS on the developer's behalf. */
  updatedBy: { role: "developer" | "admin"; at: string } | null;
};

export type SaveProfileResult = ActionResult<null, "validation_error" | "not_found" | "logo_failed">;

/** The developer account (agencies doc with accountType "developer"), or null. */
export async function findDeveloperAccount(developerId: string): Promise<AgencyDoc | null> {
  if (!ObjectId.isValid(developerId)) return null;
  return collections.agencies.findOne({ _id: new ObjectId(developerId), accountType: "developer" });
}

export function toProfileValues(a: AgencyDoc): CompanyProfileValues {
  return {
    name: a.name,
    legalName: a.legalName ?? "",
    cif: a.cif ?? "",
    description: { es: a.description?.es ?? "", en: a.description?.en ?? "" },
    website: a.website ?? "",
    contactPerson: a.contactPerson ?? "",
    contactPosition: a.contactPosition ?? "",
    contactEmail: a.contactEmail ?? "",
    phone: a.phone ?? "",
    street: a.street ?? "",
    town: a.town ?? "",
    postcode: a.postcode ?? "",
    province: a.province ?? "",
    country: a.country ?? "",
    regions: a.regions ?? [],
  };
}

export async function getDeveloperProfile(developerId: string): Promise<DeveloperProfileView | null> {
  const a = await findDeveloperAccount(developerId);
  if (!a) return null;
  return {
    values: toProfileValues(a),
    logo: a.logo ?? null,
    updatedBy: a.profileUpdatedBy ? { role: a.profileUpdatedBy.role, at: a.profileUpdatedBy.at.toISOString() } : null,
  };
}

/**
 * Validates and saves the profile of `developerId` (taken from the session or a checked route, never from the form).
 * `extra`: fields only the caller may set (the admin's relationship manager), already validated by the caller.
 */
export async function saveDeveloperProfile(
  developerId: string,
  input: unknown,
  logo: LogoChange,
  writer: ProfileWriter,
  extra: Partial<AgencyDoc> = {}
): Promise<SaveProfileResult> {
  const current = await findDeveloperAccount(developerId);
  if (!current) return fail("not_found");
  const parsed = companyProfileSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const { cif, ...v } = parsed.data;

  const now = new Date();
  const $set: Partial<AgencyDoc> = {
    ...v,
    ...extra,
    cif: cif.replace(/[\s-]/g, "").toUpperCase(),
    profileUpdatedBy: { role: writer.role, userId: writer.userId, at: now },
    updatedAt: now,
  };

  const oldKey = current.logoKey ?? null;
  if (logo === null) {
    Object.assign($set, { logo: null, logoKey: null });
  } else if (logo) {
    if (typeof logo.key !== "string" || !logo.key.startsWith(writer.pendingFolder) || logo.key.includes("..")) return fail("logo_failed");
    const check = await inspectUpload(logo.key);
    if (!check.ok) return fail("logo_failed");
    const key = `${LOGOS_PREFIX}/${developerId}/${randomUUID()}.${extensionFor(check.contentType)}`;
    try {
      await moveObject(logo.key, key, check.contentType);
    } catch (err) {
      console.error("saveDeveloperProfile: logo move failed", err);
      return fail("logo_failed");
    }
    Object.assign($set, { logo: publicImageUrl(key), logoKey: key });
  }

  await collections.agencies.updateOne({ _id: current._id, accountType: "developer" }, { $set });
  if (logo !== undefined && oldKey) await deleteKeys([oldKey]).catch(() => {});
  return ok(null);
}
