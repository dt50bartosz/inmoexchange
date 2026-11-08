// lib/server/developer/developments.ts
// Developments (collection "dev_projects"): one place that saves them, whoever does it (the developer in /promotor
// or an admin on its behalf). Callers decide who may act on which developer (developerId from the session or a checked
// route, never from the form); these functions record who did it (history + createdBy / updatedBy).
import "server-only";
import { randomUUID } from "node:crypto";
import { ObjectId, type Filter } from "mongodb";
import { collections, ensureIndexes } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { publicImageUrl } from "@/lib/server/r2";
import { deleteKeys, deletePrefix, inspectDocument, inspectUpload, moveObject, type InspectedDocument, type InspectedUpload } from "@/lib/server/storage";
import { DOCUMENT_CONTENT_TYPE, PROJECTS_PREFIX, extensionFor } from "@/lib/images/config";
import { DEFAULT_PROTECTION_DAYS, freshness, type ActivitySource, type DevelopmentVisibility } from "@/lib/constants/developers";
import { developmentSchema } from "@/lib/schemas/developments";
import type { Actor, AuditStamp, Collaboration, DevProjectDoc, Project, StoredDocument, StoredImage } from "@/types/developers";
import { diffProject, recordActivitySafely } from "@/lib/server/project-activity";

const DAY = 24 * 60 * 60 * 1000;
export const daysSince = (d: Date, now = Date.now()) => Math.max(0, Math.floor((now - d.getTime()) / DAY));

/** Older documents have a plain-string description: it was written in Spanish. */
const descriptionOf = (d: DevProjectDoc) => (typeof d.description === "string" ? { es: d.description, en: "" } : d.description);

/** No terms yet: the developer sets them (the platform never suggests a value). */
export const emptyCollaboration = (currency: Collaboration["currency"] = "EUR"): Collaboration => ({
  type: "percent",
  value: null,
  currency,
  paymentTerms: "",
  notes: "",
});

/** The writer as stored on a development or unit. */
export const stampOf = (actor: Actor): AuditStamp => ({
  role: actor.role === "admin" ? "admin" : actor.role === "system" ? "system" : "developer",
  userId: actor.userId,
});

/** Database document → what the browser gets. */
export function toProject(d: DevProjectDoc, now = Date.now()): Project {
  const main = d.images.find((i) => i.id === d.mainImageId) ?? d.images[0] ?? null;
  const days = daysSince(d.lastUpdateAt, now);
  return {
    id: d._id.toHexString(),
    developerId: d.developerId,
    name: d.name,
    address: d.address,
    town: d.town,
    province: d.province,
    country: d.country,
    latitude: d.latitude,
    longitude: d.longitude,
    mapsUrl: d.mapsUrl,
    description: descriptionOf(d),
    amenities: d.amenities ?? [],
    images: d.images.map(({ id, url, key, width, height }) => ({ id, url, key, ...(width ? { width } : {}), ...(height ? { height } : {}) })),
    mainImageId: main?.id ?? null,
    documents: (d.documents ?? []).map(({ id, key, url, kind, name, size }) => ({ id, key, url, kind, name, size })),
    collaboration: d.collaboration ?? emptyCollaboration(d.currency),
    protectionDays: d.protectionDays ?? DEFAULT_PROTECTION_DAYS,
    visibility: d.visibility ?? "published",
    publishedAt: d.publishedAt?.toISOString() ?? null,
    createdBy: d.createdBy ?? null,
    updatedBy: d.updatedBy ?? null,
    summarySource: d.summarySource ?? "manual",
    mainImageUrl: main?.url ?? null,
    unitsTotal: d.unitsTotal,
    unitsAvailable: d.unitsAvailable,
    propertyTypes: d.propertyTypes,
    priceFrom: d.priceFrom,
    priceTo: d.priceTo,
    currency: d.currency,
    bedroomsMin: d.bedroomsMin,
    bedroomsMax: d.bedroomsMax,
    status: d.status,
    expectedCompletion: d.expectedCompletion,
    actualCompletion: d.actualCompletion,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    lastUpdateAt: d.lastUpdateAt.toISOString(),
    daysSinceUpdate: days,
    freshness: freshness(days),
  };
}

/** Projects matching the filter, most recently updated first. */
export async function listProjects(filter: Filter<DevProjectDoc>): Promise<Project[]> {
  const docs = await collections.devProjects.find(filter).sort({ lastUpdateAt: -1 }).toArray();
  const now = Date.now();
  return docs.map((d) => toProject(d, now));
}

export async function findProjectDoc(id: unknown, developerId?: string) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  return collections.devProjects.findOne({ _id: new ObjectId(id), ...(developerId ? { developerId } : {}) });
}

/** Who is saving, and from where. `pendingFolder`: where this user's fresh uploads may come from. */
export type ProjectWriter = { source: ActivitySource; actor: Actor; pendingFolder: string };

export type SaveProjectResult = ActionResult<Project, "validation_error" | "not_found" | "images_failed" | "documents_failed" | "server_error">;

/**
 * Creates (existing null) or updates a project of `developerId`.
 * Validates everything again, moves fresh uploads into the project's folder, saves,
 * then writes one history entry per changed field. Saving unchanged data writes no history.
 */
export async function saveProject(
  developer: { id: string; name: string },
  existing: DevProjectDoc | null,
  input: unknown,
  writer: ProjectWriter
): Promise<SaveProjectResult> {
  const parsed = developmentSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const { images: imageInputs, mainImageId, documents: documentInputs, ...values } = parsed.data;
  if (existing && existing.developerId !== developer.id) return fail("not_found");

  // 1. Images: each one is already on this project, or a fresh upload of this user.
  const saved = new Map((existing?.images ?? []).map((i) => [i.key, i]));
  const fieldErrors: Record<string, string> = {};
  const seen = new Set<string>();
  imageInputs.forEach((img, i) => {
    const isSaved = saved.has(img.key);
    const isNew = img.key.startsWith(writer.pendingFolder) && !img.key.includes("..");
    if ((!isSaved && !isNew) || seen.has(img.key)) fieldErrors[`images.${i}`] = "photo_invalid";
    seen.add(img.key);
  });
  if (Object.keys(fieldErrors).length) return fail("validation_error", fieldErrors);

  const checks = new Map<number, InspectedUpload>();
  await Promise.all(imageInputs.map(async (img, i) => void (!saved.has(img.key) && checks.set(i, await inspectUpload(img.key)))));
  for (const [i, check] of checks) if (!check.ok) fieldErrors[`images.${i}`] = "photo_invalid";
  if (Object.keys(fieldErrors).length) return fail("validation_error", fieldErrors);

  // 2. Move fresh uploads; keep the order from the form. Ids of new images become their final key.
  const _id = existing?._id ?? new ObjectId();
  const folder = `${PROJECTS_PREFIX}/${developer.id}/${_id.toHexString()}`;
  const moved: string[] = [];
  const idMap = new Map<string, string>();
  const results = await Promise.allSettled(
    imageInputs.map(async (img, i): Promise<StoredImage> => {
      const keep = saved.get(img.key);
      if (keep) return keep; // url from the database, not from the browser
      const check = checks.get(i);
      if (!check?.ok) throw new Error("unreachable");
      const key = `${folder}/${randomUUID()}.${extensionFor(check.contentType)}`;
      await moveObject(img.key, key, check.contentType);
      moved.push(key);
      idMap.set(img.id, key);
      return { id: key, url: publicImageUrl(key), key, ...(img.width ? { width: img.width } : {}), ...(img.height ? { height: img.height } : {}) };
    })
  );
  if (results.some((r) => r.status === "rejected")) {
    console.error("saveProject: image move failed", results);
    await deleteKeys(moved).catch(() => {});
    return fail("images_failed");
  }
  const images = results.map((r) => (r as PromiseFulfilledResult<StoredImage>).value);
  const main = mainImageId ? idMap.get(mainImageId) ?? mainImageId : null;

  // 2b. Documents (PDF): the same rule as images; a new one must be a real PDF in this user's pending folder.
  const savedDocs = new Map((existing?.documents ?? []).map((d) => [d.key, d]));
  const seenDocs = new Set<string>();
  documentInputs.forEach((doc, i) => {
    const isSaved = savedDocs.has(doc.key);
    const isNew = doc.key.startsWith(writer.pendingFolder) && !doc.key.includes("..");
    if ((!isSaved && !isNew) || seenDocs.has(doc.key)) fieldErrors[`documents.${i}`] = "document_invalid";
    seenDocs.add(doc.key);
  });
  const docChecks = new Map<number, InspectedDocument>();
  if (!Object.keys(fieldErrors).length) {
    await Promise.all(documentInputs.map(async (doc, i) => void (!savedDocs.has(doc.key) && docChecks.set(i, await inspectDocument(doc.key)))));
    for (const [i, check] of docChecks) if (!check.ok) fieldErrors[`documents.${i}`] = "document_invalid";
  }
  if (Object.keys(fieldErrors).length) {
    await deleteKeys(moved).catch(() => {});
    return fail("validation_error", fieldErrors);
  }
  const docResults = await Promise.allSettled(
    documentInputs.map(async (doc, i): Promise<StoredDocument> => {
      const keep = savedDocs.get(doc.key);
      // A saved file: url and size from the database; only its kind and name may change
      if (keep) return { ...keep, kind: doc.kind, name: doc.name };
      const check = docChecks.get(i);
      if (!check?.ok) throw new Error("unreachable");
      const key = `${folder}/docs/${randomUUID()}.pdf`;
      await moveObject(doc.key, key, DOCUMENT_CONTENT_TYPE);
      moved.push(key);
      return { id: key, key, url: publicImageUrl(key), kind: doc.kind, name: doc.name, size: check.size };
    })
  );
  if (docResults.some((r) => r.status === "rejected")) {
    console.error("saveProject: document move failed", docResults);
    await deleteKeys(moved).catch(() => {});
    return fail("documents_failed");
  }
  const documents = docResults.map((r) => (r as PromiseFulfilledResult<StoredDocument>).value);

  // 3. Save.
  const now = new Date();
  const stamp = stampOf(writer.actor);
  // With units, these figures come from the units (lib/server/developer/units.ts): the form can't change them
  const fromUnits =
    existing?.summarySource === "units"
      ? {
          priceFrom: existing.priceFrom,
          priceTo: existing.priceTo,
          bedroomsMin: existing.bedroomsMin,
          bedroomsMax: existing.bedroomsMax,
          propertyTypes: existing.propertyTypes,
          unitsTotal: existing.unitsTotal,
          unitsAvailable: existing.unitsAvailable,
        }
      : {};
  const doc: DevProjectDoc = {
    ...values,
    ...fromUnits,
    summarySource: existing?.summarySource ?? "manual",
    _id,
    developerId: developer.id,
    images,
    mainImageId: main && images.some((i) => i.id === main) ? main : null,
    documents,
    // A new development is a draft until someone publishes it (setDevelopmentVisibility); saving never changes that
    visibility: existing ? (existing.visibility ?? "published") : "draft",
    publishedAt: existing?.publishedAt ?? null,
    source: existing?.source ?? { kind: "manual" },
    createdBy: existing ? (existing.createdBy ?? stamp) : stamp,
    updatedBy: stamp,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastUpdateAt: existing?.lastUpdateAt ?? now,
  };
  const entries = diffProject(existing, doc);
  // Nothing changed: don't touch the document or the history
  if (existing && entries.length === 0) return ok(toProject(existing));

  await ensureIndexes();
  try {
    if (existing) await collections.devProjects.replaceOne({ _id, developerId: developer.id }, doc);
    else await collections.devProjects.insertOne(doc);
  } catch (error) {
    console.error("saveProject: save failed", error);
    await deleteKeys(moved).catch(() => {});
    return fail("server_error");
  }

  await recordActivitySafely(
    { developerId: developer.id, developerName: developer.name, projectId: _id.toHexString(), projectName: doc.name, source: writer.source, actor: writer.actor },
    entries
  );

  // 4. Images and documents removed in the form are deleted from storage (after the save, so a failed save loses nothing).
  const removed = [...saved.keys()].filter((key) => !seen.has(key)).concat([...savedDocs.keys()].filter((key) => !seenDocs.has(key)));
  if (removed.length) await deleteKeys(removed).catch((e) => console.error("saveProject: image cleanup failed", e));

  const fresh = await collections.devProjects.findOne({ _id });
  return ok(toProject(fresh ?? doc));
}

/** What a development needs before agencies may see it. Field paths match the form. */
export function publishProblems(d: DevProjectDoc): Record<string, string> {
  const problems: Record<string, string> = {};
  if (!d.collaboration || d.collaboration.value === null) problems["collaboration.value"] = "required_to_publish";
  if (d.images.length === 0) problems.images = "required_to_publish";
  const description = descriptionOf(d);
  if (!description.es.trim() && !description.en.trim()) problems["description.es"] = "required_to_publish";
  return problems;
}

export type SetVisibilityResult = ActionResult<Project, "not_found" | "incomplete">;

/**
 * Publishes (agencies see it) or turns a development back into a draft. The developer and an admin may both do it.
 * Publishing needs collaboration terms, at least one photo and a description (publishProblems).
 */
export async function setDevelopmentVisibility(
  developer: { id: string; name: string },
  project: DevProjectDoc,
  visibility: DevelopmentVisibility,
  writer: ProjectWriter
): Promise<SetVisibilityResult> {
  if (project.developerId !== developer.id) return fail("not_found");
  const current = project.visibility ?? "published";
  if (current === visibility) return ok(toProject(project));
  if (visibility === "published") {
    const problems = publishProblems(project);
    if (Object.keys(problems).length) return fail("incomplete", problems);
  }
  const now = new Date();
  await collections.devProjects.updateOne(
    { _id: project._id, developerId: developer.id },
    {
      $set: {
        visibility,
        publishedAt: visibility === "published" ? now : (project.publishedAt ?? null),
        updatedBy: stampOf(writer.actor),
        updatedAt: now,
        lastUpdateAt: now,
      },
    }
  );
  await recordActivitySafely(
    { developerId: developer.id, developerName: developer.name, projectId: project._id.toHexString(), projectName: project.name, source: writer.source, actor: writer.actor },
    [
      visibility === "published"
        ? { type: "published", field: "visibility", description: "Published to agencies", previousValue: "draft", newValue: "published" }
        : { type: "unpublished", field: "visibility", description: "Turned back into a draft (hidden from agencies)", previousValue: "published", newValue: "draft" },
    ]
  );
  const fresh = await collections.devProjects.findOne({ _id: project._id });
  return ok(toProject(fresh ?? project));
}

/**
 * Deletes a project with its units, images and documents.
 * The history is kept: a "project deleted" entry closes it.
 */
export async function deleteProject(project: DevProjectDoc, writer: ProjectWriter) {
  const projectId = project._id.toHexString();
  await collections.properties.updateMany({ projectId }, { $unset: { projectId: "" } }); // links left from before linking was removed
  await collections.devProjects.deleteOne({ _id: project._id });
  await collections.devUnits.deleteMany({ developmentId: projectId, developerId: project.developerId });
  await recordActivitySafely(
    { developerId: project.developerId, projectId, projectName: project.name, source: writer.source, actor: writer.actor },
    [{ type: "project_deleted", description: `Project "${project.name}" deleted`, previousValue: project.name }]
  );
  await deletePrefix(`${PROJECTS_PREFIX}/${project.developerId}/${projectId}/`).catch((e) => console.error("deleteProject: image cleanup failed", e));
}
