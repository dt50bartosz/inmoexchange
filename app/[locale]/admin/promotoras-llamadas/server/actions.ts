// app/[locale]/admin/promotoras-llamadas/server/actions.ts
"use server";

import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { z } from "zod";
import { createDeveloperLead, importDeveloperLeads, updateDeveloperLead } from "@/lib/server/admin/developer-leads";
import { LEAD_IMPORT_MAX_ROWS, developerLeadSchema, leadCsvRowSchema } from "@/lib/schemas/developer-leads";
import type { DeveloperLead, LeadDuplicate } from "@/types/developer-leads";

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

export type ImportReport = {
  imported: number;
  /** Rows matching an existing developer, or an earlier row of the same file. */
  skipped: { row: number; company: string; duplicateOf: LeadDuplicate }[];
  /** Rows that failed validation here (the preview should have caught them): field → message key. */
  invalid: { row: number; errors: Record<string, string> }[];
};

const importInput = z.object({
  /** CSV rows as objects keyed by the template columns; `row` = line number in the file (header = 1). */
  rows: z.array(z.object({ row: z.number().int().min(2), cells: z.record(z.string(), z.string()) })).min(1).max(LEAD_IMPORT_MAX_ROWS),
});

/**
 * CSV import: every row is validated again with the same rules as the preview. Valid rows that look like an existing
 * developer (same number or company name), or like an earlier row of the file, are skipped and reported.
 */
export async function importDeveloperLeadsAction(input: unknown): Promise<ActionResult<ImportReport, "validation_error">> {
  await requireAdmin();
  const parsed = importInput.safeParse(input);
  if (!parsed.success) return fail("validation_error");
  const valid: Parameters<typeof importDeveloperLeads>[0] = [];
  const invalid: ImportReport["invalid"] = [];
  for (const { row, cells } of parsed.data.rows) {
    const r = leadCsvRowSchema.safeParse(cells);
    if (r.success) valid.push({ row, values: r.data });
    else invalid.push({ row, errors: zodFieldErrors(r.error) });
  }
  const result = valid.length ? await importDeveloperLeads(valid) : { imported: 0, skipped: [] };
  return ok({ ...result, invalid });
}
