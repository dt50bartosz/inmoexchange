// app/[locale]/admin/promotoras-llamadas/server/actions.ts
"use server";

import { fail, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { createDeveloperLead, updateDeveloperLead } from "@/lib/server/admin/developer-leads";
import { developerLeadSchema } from "@/lib/schemas/developer-leads";
import type { DeveloperLead } from "@/types/developer-leads";

/*
 * Admin → Developer calls: add and edit a developer. Admin only (personal data); every action checks the admin
 * and validates its input again. "duplicate": a developer with one of these numbers or the same company name
 * exists already; the field errors "duplicate.<id>" name it.
 */

export async function createDeveloperLeadAction(input: unknown): Promise<ActionResult<{ id: string }, "validation_error" | "duplicate">> {
  await requireAdmin();
  const parsed = developerLeadSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  return createDeveloperLead(parsed.data);
}

export async function updateDeveloperLeadAction(
  id: string,
  input: unknown
): Promise<ActionResult<DeveloperLead, "validation_error" | "duplicate" | "not_found">> {
  await requireAdmin();
  const parsed = developerLeadSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  return updateDeveloperLead(id, parsed.data);
}
