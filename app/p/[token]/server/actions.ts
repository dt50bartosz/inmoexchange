// app/p/[token]/server/actions.ts
"use server";

import { headers } from "next/headers";
import { ObjectId } from "mongodb";
import { getTranslations } from "next-intl/server";
import { collections } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { findLivePage } from "@/lib/server/client-pages";
import { sendEmail, viewingRequestEmail } from "@/lib/server/email";
import { recordEvent } from "@/lib/server/property-events";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { clientReactionSchema } from "@/lib/schemas/client-pages";
import { trackEventSchema } from "@/lib/schemas/property-events";

/*
 * What the client does on their page (no login: the secret link is the proof).
 * Only properties already on the page can be changed, and only the client's own fields.
 */

export async function updateItemAction(
  token: string,
  input: unknown
): Promise<ActionResult<null, "validation_error" | "not_found" | "rate_limited">> {
  const parsed = clientReactionSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await consumeRateLimit(`client-page:${ip}`, 60, 10 * 60))) return fail("rate_limited");

  const found = await findLivePage(token);
  if (!found) return fail("not_found");
  const { page, agency } = found;
  const v = parsed.data;
  const item = page.items.find((i) => i.propertyId === v.propertyId);
  if (!item) return fail("not_found");

  const $set: Record<string, unknown> = { "items.$.seenByAgent": false, updatedAt: new Date() };
  const $unset: Record<string, ""> = {};
  if (v.reaction !== undefined) {
    if (v.reaction) $set["items.$.reaction"] = v.reaction;
    else $unset["items.$.reaction"] = "";
  }
  if (v.clientComment !== undefined) $set["items.$.clientComment"] = v.clientComment;
  const newViewing = v.requestViewing && !item.viewingRequestedAt;
  if (newViewing) $set["items.$.viewingRequestedAt"] = new Date();

  await collections.clientPages.updateOne(
    { _id: page._id, "items.propertyId": v.propertyId },
    { $set, ...(Object.keys($unset).length ? { $unset } : {}) }
  );

  // A viewing request is worth an email to the agency (once per property)
  const to = agency.contactEmail || agency.email;
  if (newViewing && to) {
    const doc = ObjectId.isValid(v.propertyId)
      ? await collections.properties.findOne({ _id: new ObjectId(v.propertyId) }, { projection: { type: 1, town: 1, code: 1, reference: 1 } })
      : null;
    const t = await getTranslations("panel.properties");
    const title = doc ? `${t("titleFormat", { type: t(`types.${doc.type}`), town: doc.town || t("noTown") })} (ref ${doc.code ?? doc.reference})` : "a property";
    await sendEmail(
      viewingRequestEmail({
        to,
        buyerName: page.buyerName,
        propertyTitle: title,
        editorUrl: `/panel/client-pages/${page._id.toHexString()}`,
        comment: v.clientComment ?? item.clientComment ?? "",
      })
    );
  }
  return ok(null);
}

/**
 * A property card on the client page was seen (scrolled into view) or its WhatsApp button clicked.
 * The token decides whose page it is; only properties on this page count, and not the agent previewing it.
 * Called after the page shows; the result is ignored.
 */
export async function trackClientPageEventAction(token: string, input: unknown): Promise<ActionResult<null, "validation_error">> {
  const parsed = trackEventSchema.safeParse(input);
  if (!parsed.success || typeof token !== "string") return fail("validation_error");
  await recordEvent(parsed.data.type, { source: "microsite", token, propertyId: parsed.data.propertyId });
  return ok(null);
}
