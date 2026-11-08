// app/[locale]/admin/properties/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { toAdminProperty } from "@/lib/server/admin/agencies";
import { propertyHiddenEmail, propertyRestoredEmail, sendEmail } from "@/lib/server/email";
import { hidePropertySchema } from "@/lib/schemas/admin";
import { getTranslations } from "next-intl/server";
import type { Document } from "mongodb";
import type { AdminProperty } from "@/types/admin";

/*
 * Admin → Properties: hide a property from the network (with a reason the agency sees), or unhide it.
 * A hidden property leaves the network, XML exports and client pages straight away (see matchExport).
 */

type Result = ActionResult<AdminProperty, "not_found" | "validation_error">;

/** Where to tell the agency: its public contact email, else its login email. */
async function agencyEmailFor(property: Document) {
  if (!ObjectId.isValid(String(property.agencyId))) return null;
  const agency = await collections.agencies.findOne({ _id: new ObjectId(String(property.agencyId)) }, { projection: { contactEmail: 1, email: 1 } });
  return agency?.contactEmail || agency?.email || null;
}

async function titleOf(property: Document) {
  const t = await getTranslations("panel.properties");
  return t("titleFormat", { type: t(`types.${property.type}`), town: property.town || t("noTown") });
}

async function findProperty(id: unknown) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  return collections.properties.findOne({ _id: new ObjectId(id) });
}

export async function hidePropertyAction(id: string, input: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = hidePropertySchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  const property = await findProperty(id);
  if (!property) return fail("not_found");

  const saved = await collections.properties.findOneAndUpdate(
    { _id: property._id },
    { $set: { moderation: { reason: parsed.data.reason, at: new Date() }, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!saved) return fail("not_found");
  // Tell the agency why (an email failure doesn't undo the hide)
  const to = await agencyEmailFor(saved);
  if (to) await sendEmail(propertyHiddenEmail({ to, reference: String(saved.code ?? saved.reference ?? ""), title: await titleOf(saved), reason: parsed.data.reason }));
  return ok(toAdminProperty(saved));
}

export async function unhidePropertyAction(id: string): Promise<Result> {
  await requireAdmin();
  const property = await findProperty(id);
  if (!property) return fail("not_found");

  const saved = await collections.properties.findOneAndUpdate(
    { _id: property._id },
    { $unset: { moderation: "" }, $set: { updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!saved) return fail("not_found");
  // Only if it was actually hidden before
  const to = property.moderation ? await agencyEmailFor(saved) : null;
  if (to) await sendEmail(propertyRestoredEmail({ to, reference: String(saved.code ?? saved.reference ?? ""), title: await titleOf(saved) }));
  return ok(toAdminProperty(saved));
}
