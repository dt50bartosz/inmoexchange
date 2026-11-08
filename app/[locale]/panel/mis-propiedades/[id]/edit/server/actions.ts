// app/[locale]/panel/mis-propiedades/[id]/edit/server/actions.ts
"use server";

import { randomUUID } from "node:crypto";
import { MongoServerError, type Document } from "mongodb";
import { z } from "zod";
import { collections, ensureIndexes } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { findProperty, toProperty } from "@/lib/server/properties";
import { publicImageUrl } from "@/lib/server/r2";
import { deleteKeys, inspectUpload, moveObject, type InspectedUpload } from "@/lib/server/storage";
import { PENDING_PREFIX, PROPERTIES_PREFIX, extensionFor } from "@/lib/images/config";
import { propertyEditSchema, type Property } from "@/lib/schemas/property";
import { placeOf, propertyCoordinates } from "@/lib/server/locations";

/*
 * Save changes to a property.
 * The agency always comes from the server (findProperty only finds the current agency's properties).
 * Never throws for expected problems: returns an error code the form translates,
 * plus fieldErrors keyed by form field for setError().
 */

export type UpdatePropertyResult = ActionResult<
  Property,
  "validation_error" | "not_found" | "photos_failed" | "server_error"
>;

type StoredPhoto = { id: string; url: string; key: string; width?: number; height?: number };

/** Feed properties: the feed owns the data, the agency only controls sharing. */
const sharingSchema = z.object({ shared: z.boolean(), commission: z.string().trim().max(20) });

export async function updateProperty(id: string, input: unknown): Promise<UpdatePropertyResult> {
  const current = await findProperty(id);
  if (!current) return fail("not_found");

  const col = collections.properties;
  const filter = { _id: current._id, agencyId: current.agencyId };
  const now = new Date();

  // 1. Feed property: only shared + commission change.
  if (current.source?.kind === "feed") {
    const parsed = sharingSchema.safeParse(input);
    if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
    if (parsed.data.shared && !parsed.data.commission) return fail("validation_error", { commission: "Required" });

    const saved = await col.findOneAndUpdate(filter, { $set: { ...parsed.data, updatedAt: now } }, { returnDocument: "after" });
    return saved ? ok(toProperty(saved)) : fail("not_found");
  }

  // 2. Manual property: validate everything again on the server.
  const parsed = propertyEditSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const { newPrice, photos: photoInputs, ...values } = parsed.data;
  const agencyId = String(current.agencyId);

  // 3. Reference must stay unique within this agency.
  if (values.reference !== current.reference) {
    await ensureIndexes();
    const taken = await col.findOne(
      { agencyId, reference: values.reference, _id: { $ne: current._id } },
      { projection: { _id: 1 } }
    );
    if (taken) return fail("validation_error", { reference: "reference_taken" });
  }

  // 4. Photos: each one is either already saved on this property, or a fresh upload of this agency.
  const savedPhotos = new Map<string, StoredPhoto>(
    ((current.photos ?? []) as StoredPhoto[]).filter((p) => p.key).map((p) => [p.key, p])
  );
  const pendingFolder = `${PENDING_PREFIX}/${agencyId}/`;
  const fieldErrors: Record<string, string> = {};
  const seen = new Set<string>();
  photoInputs.forEach((photo, i) => {
    const key = photo.key ?? "";
    const isSaved = savedPhotos.has(key);
    const isNew = key.startsWith(pendingFolder) && !key.includes("..");
    if ((!isSaved && !isNew) || seen.has(key)) fieldErrors[`photos.${i}`] = "photo_invalid";
    seen.add(key);
  });
  if (Object.keys(fieldErrors).length) return fail("validation_error", fieldErrors);

  // New uploads must be real images
  const checks = new Map<number, InspectedUpload>();
  await Promise.all(
    photoInputs.map(async (photo, i) => {
      if (!savedPhotos.has(photo.key!)) checks.set(i, await inspectUpload(photo.key!));
    })
  );
  for (const [i, check] of checks) if (!check.ok) fieldErrors[`photos.${i}`] = "photo_invalid";
  if (Object.keys(fieldErrors).length) return fail("validation_error", fieldErrors);

  // 5. Move new uploads into the property's folder; keep the order from the form.
  const folder = `${PROPERTIES_PREFIX}/${agencyId}/${current._id.toHexString()}`;
  const movedKeys: string[] = [];
  const results = await Promise.allSettled(
    photoInputs.map(async (photo, i): Promise<StoredPhoto> => {
      const saved = savedPhotos.get(photo.key!);
      if (saved) return saved; // url comes from the database, not from the browser
      const check = checks.get(i);
      if (!check?.ok) throw new Error("unreachable");
      const finalKey = `${folder}/${randomUUID()}.${extensionFor(check.contentType)}`;
      await moveObject(photo.key!, finalKey, check.contentType);
      movedKeys.push(finalKey);
      return { id: finalKey, url: publicImageUrl(finalKey), key: finalKey, width: photo.width, height: photo.height };
    })
  );
  if (results.some((r) => r.status === "rejected")) {
    console.error("updateProperty: photo move failed", results);
    await deleteKeys(movedKeys).catch(() => {});
    return fail("photos_failed");
  }
  const photos = results.map((r) => (r as PromiseFulfilledResult<StoredPhoto>).value);

  // 6. Save. A new price moves the old one into the price history.
  const price = newPrice ?? current.price;
  const place = await placeOf(values.town, values.province); // the town may have changed
  // Coordinates and distance from the (possibly new) town centre: worked out here, whatever the form showed
  const coordinates = await propertyCoordinates({ ...values, coordinatesSource: values.coordinatesSource === "feed" ? "manual" : values.coordinatesSource });
  const update: Document = { $set: { ...values, ...place, ...coordinates, price, photos, updatedAt: now } };
  if (price !== current.price) update.$push = { priceHistory: { price: current.price, date: now.toISOString() } };

  let doc;
  try {
    doc = await col.findOneAndUpdate(filter, update, { returnDocument: "after" });
  } catch (error) {
    await deleteKeys(movedKeys).catch(() => {});
    if (error instanceof MongoServerError && error.code === 11000) {
      return fail("validation_error", { reference: "reference_taken" });
    }
    console.error("updateProperty: save failed", error);
    return fail("server_error");
  }
  if (!doc) {
    await deleteKeys(movedKeys).catch(() => {});
    return fail("not_found");
  }

  // Developer CRM: changes to a property that belongs to a development project go into its history

  // 7. Photos removed in the form are deleted from storage (after the save, so a failed save loses nothing).
  const removed = [...savedPhotos.keys()].filter((key) => !seen.has(key));
  if (removed.length) await deleteKeys(removed).catch((e) => console.error("updateProperty: photo cleanup failed", e));

  return ok(toProperty(doc));
}
