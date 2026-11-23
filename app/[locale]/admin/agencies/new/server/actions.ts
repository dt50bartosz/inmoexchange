// app/[locale]/admin/agencies/new/server/actions.ts
"use server";

import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { createAgency } from "@/lib/server/admin/agencies";
import { orgOf, recordAdminEvent } from "@/lib/server/platform-events";
import { addAgencySchema } from "@/lib/schemas/admin";
import type { EmailResult } from "@/lib/server/email";

/*
 * Admin → Agencies → Add agency.
 * The work is done by createAgency() in lib/server/admin/agencies.ts (also used when approving an application).
 */

export type AddAgencyResult = ActionResult<
  { id: string; feed: "none" | "added" | "failed"; email: EmailResult },
  "validation_error" | "email_taken"
>;

export async function addAgencyAction(input: unknown): Promise<AddAgencyResult> {
  const admin = await requireAdmin();
  const parsed = addAgencySchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  const result = await createAgency(parsed.data);
  if (!result.ok) return fail(result.error);
  await recordAdminEvent(admin, "account_created", await orgOf(result.id), "Added by an admin");
  return ok({ id: result.id, feed: result.feed, email: result.email });
}
