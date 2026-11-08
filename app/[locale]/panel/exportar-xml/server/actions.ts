// app/[locale]/panel/exportar-xml/server/actions.ts
"use server";

import { collections, ensureIndexes } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { toProperty } from "@/lib/server/properties";
import { countExport, findXmlExport, matchExport, newToken, scopedExport, toXmlExport } from "@/lib/server/xml-exports";
import { xmlExportSchema } from "@/lib/schemas/xmlExport";
import type { Property } from "@/lib/schemas/property";
import type { XmlExport } from "@/types/xmlExport";

/*
 * Actions for the "Exportar XML" page.
 * The agency always comes from getAgencyId() on the server, never from the browser.
 */

export type ExportCounts = { mine: number; partners: number };
export type XmlExportListItem = XmlExport & { counts: ExportCounts };
export type ExportPreview = ExportCounts & { items: { property: Property; mine: boolean }[] };

const PREVIEW_COUNT = 6;

/** All of the agency's export links, newest first, each with how many properties it contains. */
export async function getXmlExports(): Promise<ActionResult<XmlExportListItem[]>> {
  const agencyId = await getAgencyId();
  await ensureIndexes();
  const docs = await collections.xmlExports.find(scopedExport(agencyId)).sort({ createdAt: -1 }).toArray();
  const items = await Promise.all(
    docs.map(async (d) => ({ ...toXmlExport(d), counts: await countExport(agencyId, d.filters) }))
  );
  return ok(items);
}

/** Live preview for the form: counts plus the first few properties the link would contain. */
export async function previewExport(filters: unknown): Promise<ActionResult<ExportPreview>> {
  // The schema needs a name; it isn't part of the preview
  const parsed = xmlExportSchema.safeParse({ ...(filters as object), name: "preview" });
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const { name: _name, ...f } = parsed.data;

  const agencyId = await getAgencyId();
  const matches = await matchExport(agencyId, f);
  const mine = matches.filter((m) => m.mine).length;
  return ok({
    mine,
    partners: matches.length - mine,
    items: matches.slice(0, PREVIEW_COUNT).map((m) => ({ property: toProperty(m.property), mine: m.mine })),
  });
}

/** "New link": replaces the token, so the old URL stops working. */
export async function regenerateXmlExportToken(id: string): Promise<ActionResult<XmlExport, "not_found">> {
  const item = await findXmlExport(id);
  if (!item) return fail("not_found");

  const saved = await collections.xmlExports.findOneAndUpdate(
    scopedExport(item.agencyId, item._id),
    { $set: { token: newToken(), lastFetchedAt: null, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return saved ? ok(toXmlExport(saved)) : fail("not_found");
}

/** Deletes an export link; its URL stops working straight away. */
export async function deleteXmlExport(id: string): Promise<ActionResult<null, "not_found">> {
  const item = await findXmlExport(id);
  if (!item) return fail("not_found");

  await collections.xmlExports.deleteOne(scopedExport(item.agencyId, item._id));
  return ok(null);
}