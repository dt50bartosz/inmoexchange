// app/[locale]/panel/exportar-xml/new/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { collections, ensureIndexes } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { newToken, toXmlExport } from "@/lib/server/xml-exports";
import { EXPORT_FORMAT } from "@/lib/constants/xmlExport";
import { xmlExportSchema } from "@/lib/schemas/xmlExport";
import type { XmlExport, XmlExportDoc } from "@/types/xmlExport";

/** Creates an export link. The token is made on the server. */
export async function createXmlExport(input: unknown): Promise<ActionResult<XmlExport>> {
  const parsed = xmlExportSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const { name, ...filters } = parsed.data;

  const now = new Date();
  const doc: XmlExportDoc = {
    _id: new ObjectId(),
    agencyId: await getAgencyId(),
    name,
    token: newToken(),
    format: EXPORT_FORMAT,
    filters,
    createdAt: now,
    updatedAt: now,
    lastFetchedAt: null,
  };

  await ensureIndexes(); // unique token
  await collections.xmlExports.insertOne(doc);
  return ok(toXmlExport(doc));
}
