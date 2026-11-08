// app/[locale]/promotor/perfil/server/actions.ts
"use server";

import { requireRole } from "@/lib/server/auth/require-role";
import { saveDeveloperProfile, type LogoChange, type SaveProfileResult } from "@/lib/server/developer/profile";
import { developerPendingFolder } from "@/lib/images/config";

/** Perfil de la promotora → Guardar. The developer is always the logged-in one; nothing in the input can change that. */
export async function saveOwnProfileAction(input: unknown, logo: LogoChange): Promise<SaveProfileResult> {
  const { accountId, userId } = await requireRole("developer");
  return saveDeveloperProfile(accountId, input, logo, {
    role: "developer",
    userId,
    pendingFolder: developerPendingFolder(accountId),
  });
}
