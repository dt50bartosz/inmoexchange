// app/[locale]/confirm-email/[token]/server/actions.ts
"use server";

import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { confirmEmailChange } from "@/lib/server/account";

/**
 * Confirms a new login email from the link sent to it. Runs on a button click, not on opening the link,
 * so mail scanners that open links can't confirm it.
 */
export async function confirmEmailAction(token: string): Promise<ActionResult<null, "invalid" | "email_taken">> {
  const r = await confirmEmailChange(token);
  return r === "ok" ? ok(null) : fail(r);
}
