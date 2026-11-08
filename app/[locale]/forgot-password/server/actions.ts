// app/[locale]/forgot-password/server/actions.ts
"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { requestPasswordReset } from "@/lib/server/account";
import { RE, V } from "@/lib/schemas/shared";

const schema = z.object({ email: z.string().trim().min(1, V.required).regex(RE.email, V.email) });

/** Always "ok" for a valid email, whether or not it has a login (see requestPasswordReset). */
export async function forgotPasswordAction(input: unknown): Promise<ActionResult<null, "validation_error" | "rate_limited">> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return (await requestPasswordReset(parsed.data.email, ip)) === "ok" ? ok(null) : fail("rate_limited");
}
