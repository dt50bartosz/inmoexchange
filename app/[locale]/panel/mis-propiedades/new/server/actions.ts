// app/[locale]/panel/mis-propiedades/new/server/actions.ts
"use server";

import { randomUUID } from "node:crypto";
import { MongoServerError, ObjectId } from "mongodb";
import { collections, ensureIndexes } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { publicImageUrl } from "@/lib/server/r2";
import { deleteKeys, inspectUpload, moveObject } from "@/lib/server/storage";
import { PENDING_PREFIX, PROPERTIES_PREFIX, extensionFor } from "@/lib/images/config";
import { propertySchema, type Property } from "@/lib/schemas/property";
import { uniquePropertyCodes } from "@/lib/server/property-code";
import { placeOf, propertyCoordinates } from "@/lib/server/locations";

/*
 * Add a new property.
 * The agency always comes from getAgencyId() on the server, never from the browser.
 * Never throws for expected problems: returns an error code the form translates,
 * plus fieldErrors keyed by form field ("reference", "photos.3"…) for setError().
 */

export type CreatePropertyResult = ActionResult<Property, "validation_error" | "photos_failed" | "server_error">;

type StoredPhoto = { id: string; url: string; key: string; width?: number; height?: number };

export async function createProperty(input: unknown): Promise<CreatePropertyResult> {
  // 1. Validate everything again on the server.
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const { photos: photoInputs, ...values } = parsed.data;

  const agencyId = await getAgencyId();
  const col = collections.properties;
  await ensureIndexes(); // unique { agencyId, reference }

  // 2. Reference must be unique within this agency.
  if (await col.findOne({ agencyId, reference: values.reference }, { projection: { _id: 1 } })) {
    return fail("validation_error", { reference: "reference_taken" });
  }

  // 3. Every photo must be this agency's own fresh upload, and a real image.
  const pendingFolder = `${PENDING_PREFIX}/${agencyId}/`;
  const fieldErrors: Record<string, string> = {};
  const seen = new Set<string>();
  photoInputs.forEach((photo, i) => {
    const key = photo.key ?? "";
    if (!key.startsWith(pendingFolder) || key.includes("..") || seen.has(key)) {
      fieldErrors[`photos.${i}`] = "photo_invalid";
    }
    seen.add(key);
  });
  if (Object.keys(fieldErrors).length) return fail("validation_error", fieldErrors);

  const checks = await Promise.all(photoInputs.map((p) => inspectUpload(p.key!)));
  checks.forEach((check, i) => {
    if (!check.ok) fieldErrors[`photos.${i}`] = "photo_invalid";
  });
  if (Object.keys(fieldErrors).length) return fail("validation_error", fieldErrors);

  // 4. Move photos from pending/ into the property's own folder.
  const _id = new ObjectId();
  const folder = `${PROPERTIES_PREFIX}/${agencyId}/${_id.toHexString()}`;
  const movedKeys: string[] = [];

  const moves = await Promise.allSettled(
    photoInputs.map(async (photo, i): Promise<StoredPhoto> => {
      const check = checks[i];
      if (!check.ok) throw new Error("unreachable");
      const finalKey = `${folder}/${randomUUID()}.${extensionFor(check.contentType)}`;
      await moveObject(photo.key!, finalKey, check.contentType);
      movedKeys.push(finalKey);
      return { id: finalKey, url: publicImageUrl(finalKey), key: finalKey, width: photo.width, height: photo.height };
    }),
  );
  if (moves.some((m) => m.status === "rejected")) {
    console.error("createProperty: photo move failed", moves);
    await deleteKeys(movedKeys).catch(() => {});
    return fail("photos_failed");
  }
  const photos = moves.map((m) => (m as PromiseFulfilledResult<StoredPhoto>).value);

  // 5. Save, with a new platform code "AA-1234". If another request took the same code
  //    in the same instant, try again with a new one.
  const now = new Date();
  const place = await placeOf(values.town, values.province); // province / town ids for the search
  // Coordinates and distance from the town centre: worked out here, whatever the form showed
  const coordinates = await propertyCoordinates({ ...values, coordinatesSource: values.coordinatesSource === "feed" ? "manual" : values.coordinatesSource });
  let code = "";
  for (let attempt = 0; ; attempt++) {
    [code] = await uniquePropertyCodes(1);
    try {
      await col.insertOne({
        _id,
        agencyId,
        code,
        ...values,
        ...place,
        ...coordinates,
        photos,
        source: { kind: "manual" },
        hidden: false,
        priceHistory: [],
        createdAt: now,
        updatedAt: now,
      });
      break;
    } catch (error) {
      const duplicate = error instanceof MongoServerError && error.code === 11000;
      if (duplicate && error.keyPattern?.code && attempt < 3) continue;
      await deleteKeys(movedKeys).catch(() => {});
      if (duplicate) return fail("validation_error", { reference: "reference_taken" });
      console.error("createProperty: insert failed", error);
      return fail("server_error");
    }
  }

  return ok({
    ...values,
    ...coordinates,
    id: _id.toHexString(),
    code,
    photos,
    source: { kind: "manual" },
    hidden: false,
    priceHistory: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}