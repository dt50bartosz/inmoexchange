// app/[locale]/panel/client-pages/[id]/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { scopedPage, toClientPage } from "@/lib/server/client-pages";
import { saveClientPageSchema } from "@/lib/schemas/client-pages";
import type { ClientPage, ClientPageDoc } from "@/types/client-pages";

async function findPage(id: unknown) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  const agencyId = await getAgencyId();
  return collections.clientPages.findOne(scopedPage(agencyId, new ObjectId(id)));
}

/**
 * "Save and update page". The agent sends the order, notes and settings; what the client did
 * (likes, comments, viewing requests) is kept from the database, so nothing the client did since is lost.
 */
export async function saveClientPage(id: string, input: unknown): Promise<ActionResult<ClientPage, "not_found" | "validation_error">> {
  const page = await findPage(id);
  if (!page) return fail("not_found");
  const parsed = saveClientPageSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const v = parsed.data;

  const before = new Map(page.items.map((i) => [i.propertyId, i]));
  const seen = new Set<string>();
  const items: ClientPageDoc["items"] = v.items
    .filter((i) => !seen.has(i.propertyId) && seen.add(i.propertyId))
    .map((i) => {
      const old = before.get(i.propertyId);
      return old
        ? { ...old, agentComment: i.agentComment, seenByAgent: true }
        : { propertyId: i.propertyId, agentComment: i.agentComment, addedAt: new Date(), seenByAgent: true };
    });

  const saved = await collections.clientPages.findOneAndUpdate(
    { _id: page._id, agencyId: page.agencyId },
    {
      $set: { items, welcomeMessage: v.welcomeMessage, status: v.status, updatedAt: new Date(), ...(v.expiresAt ? { expiresAt: v.expiresAt } : {}) },
      ...(v.expiresAt ? {} : { $unset: { expiresAt: "" } }),
    },
    { returnDocument: "after" }
  );
  return saved ? ok(toClientPage(saved)) : fail("not_found");
}

/** Deletes the page; its link stops working straight away. */
export async function deleteClientPage(id: string): Promise<ActionResult<null, "not_found">> {
  const page = await findPage(id);
  if (!page) return fail("not_found");
  await collections.clientPages.deleteOne({ _id: page._id, agencyId: page.agencyId });
  return ok(null);
}
