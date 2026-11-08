import type { ObjectId } from "mongodb";
import type { z } from "zod";
import type { xmlExportSchema } from "@/lib/schemas/xmlExport";

export type XmlExportFormValues = z.input<typeof xmlExportSchema>;
export type XmlExportFilters = Omit<z.output<typeof xmlExportSchema>, "name">;

/** A saved export link. Every link includes both the agency's own and partner properties. */
export type XmlExport = {
  id: string;
  name: string;
  /** Secret part of the URL. "New link" replaces it, so the old URL stops working. */
  token: string;
  format: "kyero-v3";
  filters: XmlExportFilters;
  createdAt: string; // ISO
  lastFetchedAt: string | null; // ISO: last time a website/CRM read the feed
};

/** An export link as stored in MongoDB (collection "xml_exports"). The browser uses `XmlExport`. */
export interface XmlExportDoc {
  _id: ObjectId;
  agencyId: string;
  name: string;
  token: string;
  format: "kyero-v3";
  filters: XmlExportFilters;
  createdAt: Date;
  updatedAt: Date;
  lastFetchedAt: Date | null;
}
