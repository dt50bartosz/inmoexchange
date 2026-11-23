// app/[locale]/change-password/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { getLocale } from "next-intl/server";
import { auth, roleOf, unstable_update } from "@/lib/auth";
import { collections } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { hashPassword, verifyPassword } from "@/lib/server/passwords";
import { checkConsent, pendingDocsFor, recordAcceptances } from "@/lib/server/legal-acceptances";
import { firstLoginSchema } from "@/lib/schemas/auth";

/**
 * First login: replaces the temporary password from the email with the user's own. Agency and developer logins also
 * accept the legal documents in force they haven't accepted yet (checked on the server, versions saved) and give or
 * refuse marketing consent. The user comes from the session, never from the browser.
 */
export async function setNewPasswordAction(
  input: unknown
): Promise<ActionResult<null, "validation_error" | "not_found" | "same_password" | "legal_outdated">> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || !ObjectId.isValid(id)) return fail("not_found");

  const parsed = firstLoginSchema.safeParse(input);
  const user = await collections.users.findOne({ _id: new ObjectId(id) });
  if (!user) return fail("not_found");
  const role = roleOf(user);

  // Agency / developer: the documents still pending (none if all were accepted when registering)
  const audience = role === "admin" ? null : role;
  const pending = audience ? await pendingDocsFor(audience, { userId: id, orgId: user.agencyId }) : [];
  const consent = audience
    ? await checkConsent(audience, (input as { legal?: unknown } | null)?.legal, { docs: pending, needsAuthorised: false })
    : null;
  if (!parsed.success || (consent && !consent.ok)) {
    if (consent && !consent.ok && consent.error === "legal_outdated") return fail("legal_outdated");
    return fail("validation_error", { ...(parsed.success ? {} : zodFieldErrors(parsed.error)), ...(consent && !consent.ok ? consent.fieldErrors : {}) });
  }

  // The emailed password must not stay in use
  if (user.passwordHash && (await verifyPassword(user.passwordHash, parsed.data.password))) {
    return fail("same_password", { password: "passwordSame" });
  }

  const now = new Date();
  await collections.users.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: await hashPassword(parsed.data.password),
        mustChangePassword: false,
        passwordChangedAt: now,
        ...(consent?.ok
          ? {
              termsAcceptedAt: now, // when they accepted the legal documents (UTC); versions in legal_acceptances
              marketingConsent: { granted: consent.data.marketing, at: now },
            }
          : {}),
        updatedAt: now,
      },
    }
  );
  if (consent?.ok) {
    await recordAcceptances(consent.data, { userId: id, orgId: user.agencyId, email: user.email }, "first_login", await getLocale()).catch((e) =>
      console.error("first login: recordAcceptances failed", e)
    );
  }
  await unstable_update({}); // re-reads the user into the session (see lib/auth.ts jwt callback)
  return ok(null);
}
