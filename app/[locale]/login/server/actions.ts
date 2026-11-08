// app/[locale]/login/server/actions.ts
"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/lib/auth";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { loginSchema } from "@/lib/schemas/auth";

export type LoginError = "validation_error" | "invalid" | "suspended" | "rate_limited";

/** Only a path on this site ("/panel/…"), never another site ("//evil.com", "https://…"). */
const safePath = (p: unknown) => (typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.includes("\\") ? p : "/panel");

/** Checks the email and password and sets the session cookie. Returns where to go next. */
export async function loginAction(input: unknown, callbackUrl?: string): Promise<ActionResult<{ redirectTo: string }, LoginError>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      const code = err.code as LoginError;
      return fail(code === "suspended" || code === "rate_limited" ? code : "invalid");
    }
    if (err instanceof AuthError) return fail("invalid");
    throw err;
  }
  return ok({ redirectTo: safePath(callbackUrl) });
}
