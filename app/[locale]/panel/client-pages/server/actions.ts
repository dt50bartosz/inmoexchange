// app/[locale]/panel/client-pages/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { collections, ensureIndexes } from "@/lib/db";
import { getAgencyId, getCurrentAgency } from "@/lib/server/current-agency";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { findContact } from "@/lib/server/crm";
import { newPageToken, scopedPage, searchPool, toClientPage } from "@/lib/server/client-pages";
import { poolFiltersSchema } from "@/lib/schemas/client-pages";
import type { ClientPage, ClientPageDoc, Property } from "@/types/client-pages";

/*
 * Client pages list + new page + the editor's property search.
 * The agency always comes from getAgencyId() on the server, never from the browser.
 */

/** All of the agency's client pages, most recently updated first. */
export async function getClientPages(): Promise<ActionResult<ClientPage[]>> {
  const agencyId = await getAgencyId();
  const docs = await collections.clientPages.find(scopedPage(agencyId)).sort({ updatedAt: -1 }).toArray();
  return ok(docs.map(toClientPage));
}

/** One page per CRM buyer: returns the existing one if there is one. */
export async function createClientPage(contactId: string): Promise<ActionResult<{ id: string }, "not_found">> {
  const agencyId = await getAgencyId();
  const contact = await findContact(contactId); // scoped to this agency
  if (!contact) return fail("not_found");

  const existing = await collections.clientPages.findOne({ agencyId, contactId: contact._id.toHexString() }, { projection: { _id: 1 } });
  if (existing) return ok({ id: existing._id.toHexString() });

  const { name: agencyName } = await getCurrentAgency();
  const first = contact.name.trim().split(/\s+/)[0] ?? "";
  const now = new Date();
  const doc: ClientPageDoc = {
    _id: new ObjectId(),
    agencyId,
    contactId: contact._id.toHexString(),
    buyerName: contact.name,
    ...(contact.phone ? { buyerPhone: contact.phone } : {}),
    token: newPageToken(),
    status: "live",
    welcomeMessage: `Hi ${first}, here are the homes we've picked for you at ${agencyName}. Tap the heart on the ones you like, and tell us which you'd like to see.`,
    createdAt: now,
    updatedAt: now,
    viewCount: 0,
    items: [],
  };
  await ensureIndexes(); // unique token
  await collections.clientPages.insertOne(doc);
  return ok({ id: doc._id.toHexString() });
}

/** The editor's search: own properties + partners' shared ones (the network rule). */
export async function searchClientPageProperties(filters: unknown): Promise<ActionResult<Property[]>> {
  const agencyId = await getAgencyId();
  const f = poolFiltersSchema.parse(filters ?? {});
  return ok(await searchPool(agencyId, f));
}
