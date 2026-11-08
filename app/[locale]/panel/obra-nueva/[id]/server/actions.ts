// app/[locale]/panel/obra-nueva/[id]/server/actions.ts
"use server";

import { requireRole } from "@/lib/server/auth/require-role";
import { createRegistration, type CreateRegistrationResult } from "@/lib/server/developer/registrations";

/**
 * Obra nueva → Registrar cliente. The agency comes from the session and the development from the page (bound),
 * never from the form; lib/server/developer/registrations.ts checks the development is published and the buyer free.
 */
export async function registerClientAction(developmentId: string, input: unknown): Promise<CreateRegistrationResult> {
  const { accountId, account, userId } = await requireRole("agency");
  return createRegistration({ id: accountId, name: account.name }, userId, { ...(input as object), developmentId });
}
