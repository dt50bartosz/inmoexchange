// app/[locale]/reset-password/[token]/server/actions.ts
"use server";

import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { resetPassword } from "@/lib/server/account";
import { newPasswordSchema } from "@/lib/schemas/auth";

/** Sets the new password from a "forgot password" link. The token is the proof; it works once. */
export async function resetPasswordAction(token: string, input: unknown): Promise<ActionResult<null, "validation_error" | "invalid">> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  return (await resetPassword(token, parsed.data.password)) === "ok" ? ok(null) : fail("invalid");
}
