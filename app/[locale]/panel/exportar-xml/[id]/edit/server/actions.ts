// app/[locale]/panel/exportar-xml/[id]/edit/server/actions.ts
"use server";

import { collections } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { findXmlExport, scopedExport, toXmlExport } from "@/lib/server/xml-exports";
import { xmlExportSchema } from "@/lib/schemas/xmlExport";
import type { XmlExport } from "@/types/xmlExport";

/** One of the agency's export links, for the edit page. */
export async function getXmlExport(id: string): Promise<ActionResult<XmlExport, "not_found">> {
  const item = await findXmlExport(id);
  return item ? ok(toXmlExport(item)) : fail("not_found");
}

/** Saves the name and filters. The link (token) stays the same. */
export async function updateXmlExport(id: string, input: unknown): Promise<ActionResult<XmlExport>> {
  const item = await findXmlExport(id);
  if (!item) return fail("not_found");

  const parsed = xmlExportSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const { name, ...filters } = parsed.data;

  const saved = await collections.xmlExports.findOneAndUpdate(
    scopedExport(item.agencyId, item._id),
    { $set: { name, filters, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return saved ? ok(toXmlExport(saved)) : fail("not_found");
}
