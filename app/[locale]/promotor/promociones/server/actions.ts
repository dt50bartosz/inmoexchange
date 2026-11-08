// app/[locale]/promotor/promociones/server/actions.ts
"use server";

import { developerPendingFolder } from "@/lib/images/config";
import { developmentVisibilitySchema } from "@/lib/schemas/developments";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { requireRole } from "@/lib/server/auth/require-role";
import {
  deleteProject,
  findProjectDoc,
  saveProject,
  setDevelopmentVisibility,
  type ProjectWriter,
  type SaveProjectResult,
  type SetVisibilityResult,
} from "@/lib/server/developer/developments";
import { createProjectWithUnits } from "@/lib/server/developer/units";

/*
 * Developer panel → Promociones. The developer always comes from the login session (requireRole), never from the browser,
 * and every lookup is scoped to it: a developer can only see and change its own developments.
 * Saves go through lib/server/developer/developments.ts (the same helpers the admin uses), which records who did what.
 */

async function developerContext() {
  const { accountId, account, actor } = await requireRole("developer");
  const writer: ProjectWriter = { source: "developer", actor, pendingFolder: developerPendingFolder(accountId) };
  return { developer: { id: accountId, name: account.name }, writer };
}

/** `units`: the rows of the units table on "Nueva promoción" (optional; checked before anything is saved). */
export async function createDevelopmentAction(input: unknown, units: unknown = []): Promise<SaveProjectResult> {
  const { developer, writer } = await developerContext();
  return createProjectWithUnits(developer, input, units, writer);
}

export async function updateDevelopmentAction(developmentId: string, input: unknown): Promise<SaveProjectResult> {
  const { developer, writer } = await developerContext();
  const project = await findProjectDoc(developmentId, developer.id);
  if (!project) return fail("not_found");
  return saveProject(developer, project, input, writer);
}

/** Publicar (agencies see it) / Volver a borrador. */
export async function setDevelopmentVisibilityAction(developmentId: string, visibility: unknown): Promise<SetVisibilityResult | ActionResult<never, "validation_error">> {
  const parsed = developmentVisibilitySchema.safeParse(visibility);
  if (!parsed.success) return fail("validation_error");
  const { developer, writer } = await developerContext();
  const project = await findProjectDoc(developmentId, developer.id);
  if (!project) return fail("not_found");
  return setDevelopmentVisibility(developer, project, parsed.data, writer);
}

export async function deleteDevelopmentAction(developmentId: string): Promise<ActionResult<null, "not_found">> {
  const { developer, writer } = await developerContext();
  const project = await findProjectDoc(developmentId, developer.id);
  if (!project) return fail("not_found");
  await deleteProject(project, writer);
  return ok(null);
}
