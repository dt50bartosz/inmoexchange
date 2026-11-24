// app/[locale]/admin/promotoras-llamadas/[id]/server/actions.ts
"use server";

import { fail, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { logDeveloperLeadCall } from "@/lib/server/admin/developer-leads";
import { logCallSchema } from "@/lib/schemas/developer-leads";
import type { DeveloperLead } from "@/types/developer-leads";

/*
 * Admin → Developer calls → one developer. Admin only (personal data); input validated again here.
 */

/**
 * Logs a call: adds it to the history, the outcome becomes the status, and the callback date sets the next call
 * (empty = cleared). The number used must be one of the developer's own numbers (or none).
 */
export async function logCallAction(
  id: string,
  input: unknown
): Promise<ActionResult<DeveloperLead, "validation_error" | "not_found" | "unknown_number">> {
  await requireAdmin();
  const parsed = logCallSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  return logDeveloperLeadCall(id, parsed.data);
}
