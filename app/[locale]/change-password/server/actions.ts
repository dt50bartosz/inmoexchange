// app/[locale]/change-password/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { auth, unstable_update } from "@/lib/auth";
import { collections } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { hashPassword, verifyPassword } from "@/lib/server/passwords";
import { newPasswordSchema } from "@/lib/schemas/auth";

/**
 * First login: replaces the temporary password from the email with the agency's own.
 * The user comes from the session, never from the browser.
 */
export async function setNewPasswordAction(input: unknown): Promise<ActionResult<null, "validation_error" | "not_found" | "same_password">> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || !ObjectId.isValid(id)) return fail("not_found");

  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  const user = await collections.users.findOne({ _id: new ObjectId(id) });
  if (!user) return fail("not_found");
  // The emailed password must not stay in use
  if (user.passwordHash && (await verifyPassword(user.passwordHash, parsed.data.password))) {
    return fail("same_password", { password: "passwordSame" });
  }

  await collections.users.updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false, passwordChangedAt: new Date(), updatedAt: new Date() } }
  );
  await unstable_update({}); // re-reads the user into the session (see lib/auth.ts jwt callback)
  return ok(null);
}
