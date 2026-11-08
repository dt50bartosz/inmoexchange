// app/[locale]/admin/promotores/[id]/registros/server/actions.ts
"use server";

import { fail } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { findDeveloperDoc } from "@/lib/server/admin/developers";
import { decideRegistration, type DecideRegistrationResult } from "@/lib/server/developer/registrations";

/**
 * Accept / reject a client registration on the developer's behalf. Same helper and rules as the developer
 * (accepting protects the agency and refuses the other agencies' registrations of that buyer); recorded as decided
 * by an admin. The registration must belong to the developer in the URL.
 */
export async function decideRegistrationAction(developerId: string, registrationId: string, input: unknown): Promise<DecideRegistrationResult> {
  const admin = await requireAdmin();
  if (!(await findDeveloperDoc(developerId))) return fail("not_found");
  return decideRegistration(developerId, registrationId, input, { role: "admin", userId: admin.id });
}
