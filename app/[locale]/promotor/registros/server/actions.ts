// app/[locale]/promotor/registros/server/actions.ts
"use server";

import { requireRole } from "@/lib/server/auth/require-role";
import { decideRegistration, type DecideRegistrationResult } from "@/lib/server/developer/registrations";

/** Aceptar / Rechazar a client registration. Only the logged-in developer's own registrations can be decided. */
export async function decideRegistrationAction(registrationId: string, input: unknown): Promise<DecideRegistrationResult> {
  const { accountId, userId } = await requireRole("developer");
  return decideRegistration(accountId, registrationId, input, { role: "developer", userId });
}
