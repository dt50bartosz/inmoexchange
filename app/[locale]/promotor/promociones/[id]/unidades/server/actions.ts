// app/[locale]/promotor/promociones/[id]/unidades/server/actions.ts
"use server";

import { developerPendingFolder } from "@/lib/images/config";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { requireRole } from "@/lib/server/auth/require-role";
import { findProjectDoc, type ProjectWriter } from "@/lib/server/developer/developments";
import { bulkUpdateUnits, deleteUnit, findUnitDoc, saveUnit, type BulkUnitsResult, type SaveUnitResult } from "@/lib/server/developer/units";

/*
 * Developer panel → Promoción → Unidades. The developer comes from the session; the development and the unit
 * must both be its own (another developer's id is "not found"). Saves go through lib/server/developer/units.ts.
 */

async function load(developmentId: string) {
  const { accountId, account, actor } = await requireRole("developer");
  const developer = { id: accountId, name: account.name };
  const writer: ProjectWriter = { source: "developer", actor, pendingFolder: developerPendingFolder(accountId) };
  const development = await findProjectDoc(developmentId, accountId);
  return { developer, writer, development };
}

export async function createUnitAction(developmentId: string, input: unknown): Promise<SaveUnitResult> {
  const { developer, writer, development } = await load(developmentId);
  if (!development) return fail("not_found");
  return saveUnit(developer, development, null, input, writer);
}

export async function updateUnitAction(developmentId: string, unitId: string, input: unknown): Promise<SaveUnitResult> {
  const { developer, writer, development } = await load(developmentId);
  if (!development) return fail("not_found");
  const unit = await findUnitDoc(unitId, developer.id, developmentId);
  if (!unit) return fail("not_found");
  return saveUnit(developer, development, unit, input, writer);
}

export async function deleteUnitAction(developmentId: string, unitId: string): Promise<ActionResult<null, "not_found">> {
  const { developer, writer, development } = await load(developmentId);
  if (!development) return fail("not_found");
  const unit = await findUnitDoc(unitId, developer.id, developmentId);
  if (!unit) return fail("not_found");
  await deleteUnit(developer, development, unit, writer);
  return ok(null);
}

/** Selected units → new status and/or price. */
export async function bulkUpdateUnitsAction(developmentId: string, input: unknown): Promise<BulkUnitsResult> {
  const { developer, writer, development } = await load(developmentId);
  if (!development) return fail("not_found");
  return bulkUpdateUnits(developer, development, input, writer);
}
