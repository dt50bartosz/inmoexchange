// app/[locale]/admin/promotores/[id]/promociones/[developmentId]/unidades/server/actions.ts
"use server";

import { adminPendingFolder } from "@/lib/images/config";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { findDeveloperDoc } from "@/lib/server/admin/developers";
import { findProjectDoc, type ProjectWriter } from "@/lib/server/developer/developments";
import { bulkUpdateUnits, deleteUnit, findUnitDoc, saveUnit, type BulkUnitsResult, type SaveUnitResult } from "@/lib/server/developer/units";
import { adminActor } from "@/lib/server/project-activity";

/*
 * Admin → developer → development → Units, on the developer's behalf. Same helpers as the developer's own page
 * (lib/server/developer/units.ts), saved as made by an admin. The development must belong to the developer in the
 * URL, and the unit to that development; anything else is "not found".
 */

async function load(developerId: string, developmentId: string) {
  const admin = await requireAdmin();
  const writer: ProjectWriter = { source: "admin", actor: adminActor(admin), pendingFolder: adminPendingFolder(admin.id) };
  const doc = await findDeveloperDoc(developerId);
  const development = doc && (await findProjectDoc(developmentId, developerId));
  return { developer: doc ? { id: developerId, name: doc.name } : null, writer, development };
}

export async function createUnitAction(developerId: string, developmentId: string, input: unknown): Promise<SaveUnitResult> {
  const { developer, writer, development } = await load(developerId, developmentId);
  if (!developer || !development) return fail("not_found");
  return saveUnit(developer, development, null, input, writer);
}

export async function updateUnitAction(developerId: string, developmentId: string, unitId: string, input: unknown): Promise<SaveUnitResult> {
  const { developer, writer, development } = await load(developerId, developmentId);
  if (!developer || !development) return fail("not_found");
  const unit = await findUnitDoc(unitId, developerId, developmentId);
  if (!unit) return fail("not_found");
  return saveUnit(developer, development, unit, input, writer);
}

export async function deleteUnitAction(developerId: string, developmentId: string, unitId: string): Promise<ActionResult<null, "not_found">> {
  const { developer, writer, development } = await load(developerId, developmentId);
  if (!developer || !development) return fail("not_found");
  const unit = await findUnitDoc(unitId, developerId, developmentId);
  if (!unit) return fail("not_found");
  await deleteUnit(developer, development, unit, writer);
  return ok(null);
}

export async function bulkUpdateUnitsAction(developerId: string, developmentId: string, input: unknown): Promise<BulkUnitsResult> {
  const { developer, writer, development } = await load(developerId, developmentId);
  if (!developer || !development) return fail("not_found");
  return bulkUpdateUnits(developer, development, input, writer);
}
