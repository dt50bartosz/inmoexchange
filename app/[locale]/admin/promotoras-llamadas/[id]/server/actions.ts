// app/[locale]/admin/promotoras-llamadas/[id]/server/actions.ts
"use server";

import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { deleteDeveloperLead, logDeveloperLeadCall } from "@/lib/server/admin/developer-leads";
import { recordAdminEvent } from "@/lib/server/platform-events";
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

/**
 * GDPR deletion request: removes the developer and its whole call history permanently. Admin → Activity keeps a
 * record that it happened, with the company name only (no person, number or email).
 */
export async function deleteDeveloperLeadAction(id: string): Promise<ActionResult<null, "not_found">> {
  const admin = await requireAdmin();
  const res = await deleteDeveloperLead(id);
  if (!res.ok) return res;
  await recordAdminEvent(admin, "lead_deleted", null, `Developer call contact “${res.data.company}” deleted permanently with its call history`);
  return ok(null);
}
