// app/[locale]/panel/security/server/actions.ts
"use server";

import { getCurrentAgency } from "@/lib/server/current-agency";
import { fail, ok, zodFieldErrors } from "@/lib/server/action-result";
import * as account from "@/lib/server/account";
import { emailChangeSchema, passwordChangeSchema } from "@/lib/schemas/security";
import type { SecurityActionResult } from "@/components/security/types";

/*
 * Security page for agencies. getCurrentAgency() first: only a logged-in agency with a current session gets here.
 * The admin page has the same actions in app/[locale]/admin/security/server/actions.ts.
 */

export async function changePasswordAction(input: unknown): Promise<SecurityActionResult> {
  await getCurrentAgency();
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const r = await account.changePassword(parsed.data.current, parsed.data.next);
  if (r === "wrong_password") return fail("wrong_password", { current: "wrongPassword" });
  return r === "ok" ? ok(null) : fail(r);
}

export async function requestEmailChangeAction(input: unknown): Promise<SecurityActionResult> {
  const user = await account.sessionUser();
  await getCurrentAgency();
  if (!user) return fail("not_found");
  const parsed = emailChangeSchema(user.email).safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const r = await account.requestEmailChange(parsed.data.newEmail, parsed.data.password);
  if (r === "wrong_password") return fail("wrong_password", { password: "wrongPassword" });
  if (r === "email_taken") return fail("email_taken", { newEmail: "emailTaken" });
  return r === "ok" ? ok(null) : fail(r);
}

export async function resendEmailChangeAction(): Promise<SecurityActionResult> {
  await getCurrentAgency();
  const r = await account.resendEmailChange();
  return r === "ok" ? ok(null) : fail(r);
}

export async function cancelEmailChangeAction(): Promise<SecurityActionResult> {
  await getCurrentAgency();
  return (await account.cancelEmailChange()) ? ok(null) : fail("not_found");
}

export async function signOutEverywhereAction(): Promise<SecurityActionResult> {
  await getCurrentAgency();
  return (await account.signOutEverywhere()) ? ok(null) : fail("not_found");
}
