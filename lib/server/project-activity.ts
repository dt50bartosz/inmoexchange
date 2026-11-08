// lib/server/project-activity.ts
// The permanent update history of development projects (collection "project_activity").
// Every change is written here by the code that makes it: project saves (admin and developer panel),
// property edits/deletes on linked properties, feed imports and developer logins.
// Entries are only added, never edited or deleted. Nothing is written when nothing changed.
import "server-only";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import {
  PROJECT_STATUS_LABELS,
  UPDATE_ACTIVITY_TYPES,
  type ActivitySource,
  type ActivityType,
} from "@/lib/constants/developers";
import type { Activity, ActivityDoc, Actor, DevProjectDoc } from "@/types/developers";
import type { UserDoc } from "@/types/models";

/** One change, before it's stored. */
export type ActivityEntry = {
  type: ActivityType;
  description: string;
  field?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  propertyId?: string | null;
};

export type ActivityContext = {
  developerId: string;
  /** Looked up when missing. */
  developerName?: string;
  projectId: string | null;
  projectName: string | null;
  source: ActivitySource;
  actor: Actor;
};

export const SYSTEM_ACTOR: Actor = { userId: null, email: null, role: "system" };

export const adminActor = (admin: { id: string; email: string }): Actor => ({ userId: admin.id, email: admin.email, role: "admin" });

/* ---------- Writing ---------- */

/**
 * Stores the entries (one timestamp for the whole batch) and moves the "last update" / "last activity"
 * times forward. An empty list writes nothing, so callers can always pass the result of a diff.
 */
export async function recordActivity(ctx: ActivityContext, entries: ActivityEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const now = new Date();
  const developerName = ctx.developerName ?? (await developerNameOf(ctx.developerId));

  const docs: ActivityDoc[] = entries.map((e) => ({
    _id: new ObjectId(),
    developerId: ctx.developerId,
    developerName,
    projectId: ctx.projectId,
    projectName: ctx.projectName,
    propertyId: e.propertyId ?? null,
    type: e.type,
    source: ctx.source,
    actor: ctx.actor,
    field: e.field ?? null,
    description: e.description,
    previousValue: e.previousValue ?? null,
    newValue: e.newValue ?? null,
    createdAt: now,
  }));
  await collections.projectActivity.insertMany(docs);

  const isUpdate = entries.some((e) => UPDATE_ACTIVITY_TYPES.includes(e.type));
  const writes: Promise<unknown>[] = [];
  if (isUpdate && ctx.projectId && ObjectId.isValid(ctx.projectId)) {
    writes.push(collections.devProjects.updateOne({ _id: new ObjectId(ctx.projectId) }, { $max: { lastUpdateAt: now } }));
  }
  // The developer's "last activity" is what the developer (or its feed) did: admin edits and notes don't count,
  // so a developer the admin keeps up to date still shows as needing contact
  if (ctx.source !== "admin" && ObjectId.isValid(ctx.developerId)) {
    writes.push(collections.agencies.updateOne({ _id: new ObjectId(ctx.developerId) }, { $max: { lastActivityAt: now } }));
  }
  await Promise.all(writes);
}

/** Never lets a history problem break the change itself (the change is already saved). */
export async function recordActivitySafely(ctx: ActivityContext, entries: ActivityEntry[]) {
  try {
    await recordActivity(ctx, entries);
  } catch (error) {
    console.error("recordActivity failed", ctx.projectId ?? ctx.developerId, error);
  }
}

async function developerNameOf(developerId: string) {
  if (!ObjectId.isValid(developerId)) return "";
  const a = await collections.agencies.findOne({ _id: new ObjectId(developerId) }, { projection: { name: 1 } });
  return a?.name ?? "";
}

/** A developer logged in: one entry, and their "last activity" moves. Agencies are ignored. */
export async function recordLogin(user: Pick<UserDoc, "_id" | "email" | "agencyId">) {
  if (!user.agencyId || !ObjectId.isValid(user.agencyId)) return;
  const agency = await collections.agencies.findOne(
    { _id: new ObjectId(user.agencyId), accountType: "developer" },
    { projection: { name: 1 } }
  );
  if (!agency) return;
  await recordActivitySafely(
    {
      developerId: user.agencyId,
      developerName: agency.name,
      projectId: null,
      projectName: null,
      source: "developer",
      actor: { userId: user._id.toHexString(), email: user.email, role: "developer" },
    },
    [{ type: "login", description: "Logged in to the panel" }]
  );
}

/* ---------- Comparing ---------- */

const money = (n: number | null, currency: string) =>
  n === null ? null : `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(n)} ${currency}`;
const plain = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
const short = (s: string | null) => (s && s.length > 300 ? `${s.slice(0, 300)}…` : s);
/** es / en description (older documents: a plain string) → one line per language. */
const descriptionText = (v: unknown) => {
  if (typeof v === "string" || v == null) return plain(v);
  const d = v as { es?: string; en?: string };
  return [d.es && `ES: ${d.es}`, d.en && `EN: ${d.en}`].filter(Boolean).join("\n") || null;
};
const collaborationText = (v: unknown) => {
  const c = v as { type: string; value: number | null; currency: string; paymentTerms: string } | undefined;
  if (!c || c.value === null) return null;
  const amount = c.type === "percent" ? `${c.value}%` : money(c.value, c.currency);
  return c.paymentTerms ? `${amount} · ${c.paymentTerms}` : amount;
};

type FieldRule = {
  field: keyof DevProjectDoc;
  label: string;
  type: ActivityType;
  show?: (v: unknown, doc: DevProjectDoc) => string | null;
};

/** Every tracked project field, in the order changes are listed. */
const FIELDS: FieldRule[] = [
  { field: "status", label: "Status", type: "status_changed", show: (v) => PROJECT_STATUS_LABELS[v as keyof typeof PROJECT_STATUS_LABELS] ?? plain(v) },
  { field: "priceFrom", label: "Starting price", type: "price_changed", show: (v, d) => money(v as number | null, d.currency) },
  { field: "priceTo", label: "Maximum price", type: "price_changed", show: (v, d) => money(v as number | null, d.currency) },
  { field: "currency", label: "Currency", type: "price_changed" },
  { field: "unitsAvailable", label: "Available units", type: "availability_changed" },
  { field: "unitsTotal", label: "Number of properties", type: "details_changed" },
  { field: "name", label: "Project name", type: "details_changed" },
  { field: "address", label: "Address", type: "details_changed" },
  { field: "town", label: "Town", type: "details_changed" },
  { field: "province", label: "Province", type: "details_changed" },
  { field: "country", label: "Country", type: "details_changed" },
  { field: "mapsUrl", label: "Google Maps link", type: "details_changed" },
  { field: "description", label: "Description", type: "details_changed", show: (v) => short(descriptionText(v)) },
  { field: "amenities", label: "Amenities", type: "details_changed", show: (v) => ((v as string[]) ?? []).join(", ") || null },
  { field: "collaboration", label: "Collaboration terms", type: "collaboration_changed", show: collaborationText },
  { field: "protectionDays", label: "Client protection (days)", type: "collaboration_changed" },
  { field: "propertyTypes", label: "Property types", type: "details_changed", show: (v) => ((v as string[]) ?? []).join(", ") || null },
  { field: "bedroomsMin", label: "Bedrooms (min)", type: "details_changed" },
  { field: "bedroomsMax", label: "Bedrooms (max)", type: "details_changed" },
  { field: "expectedCompletion", label: "Expected completion", type: "details_changed" },
  { field: "actualCompletion", label: "Actual completion", type: "details_changed" },
];

const coords = (d: DevProjectDoc) => (d.latitude === null || d.longitude === null ? null : `${d.latitude}, ${d.longitude}`);

/**
 * What changed between two versions of a project, one entry per field.
 * `before` null = the project was just created.
 */
export function diffProject(before: DevProjectDoc | null, after: DevProjectDoc): ActivityEntry[] {
  if (!before) {
    return [{ type: "project_created", description: `Project "${after.name}" created` }];
  }
  const out: ActivityEntry[] = [];

  for (const rule of FIELDS) {
    const show = rule.show ?? ((v: unknown) => plain(v));
    const a = show(before[rule.field], before);
    const b = show(after[rule.field], after);
    // Compare the raw values (description shortening must not hide a change)
    const rawA = JSON.stringify(before[rule.field] ?? null);
    const rawB = JSON.stringify(after[rule.field] ?? null);
    if (rawA === rawB) continue;
    out.push({
      type: rule.type,
      field: String(rule.field),
      description: `${rule.label} changed`,
      previousValue: a,
      newValue: b,
    });
  }

  if (coords(before) !== coords(after)) {
    out.push({ type: "details_changed", field: "coordinates", description: "Map location changed", previousValue: coords(before), newValue: coords(after) });
  }

  const beforeIds = new Set(before.images.map((i) => i.id));
  const afterIds = new Set(after.images.map((i) => i.id));
  const added = after.images.filter((i) => !beforeIds.has(i.id)).length;
  const removed = before.images.filter((i) => !afterIds.has(i.id)).length;
  if (added || removed) {
    const parts = [added && `${added} added`, removed && `${removed} removed`].filter(Boolean).join(", ");
    out.push({
      type: "images_changed",
      field: "images",
      description: `Images changed (${parts})`,
      previousValue: `${before.images.length} images`,
      newValue: `${after.images.length} images`,
    });
  }
  // Documents: files added or removed (renaming or re-labelling one counts as a change too)
  const docKey = (d: { key: string; kind: string; name: string }) => `${d.key}|${d.kind}|${d.name}`;
  const beforeDocs = before.documents ?? [];
  const afterDocs = after.documents ?? [];
  if (beforeDocs.map(docKey).join() !== afterDocs.map(docKey).join()) {
    out.push({
      type: "documents_changed",
      field: "documents",
      description: "Documents changed",
      previousValue: beforeDocs.map((d) => d.name).join(", ") || null,
      newValue: afterDocs.map((d) => d.name).join(", ") || null,
    });
  }

  const mainOf = (d: DevProjectDoc) => d.mainImageId ?? d.images[0]?.id ?? null;
  if (!added && !removed && mainOf(before) !== mainOf(after)) {
    out.push({ type: "images_changed", field: "mainImageId", description: "Main image changed" });
  } else if (!added && !removed && before.images.map((i) => i.id).join() !== after.images.map((i) => i.id).join()) {
    out.push({ type: "images_changed", field: "images", description: "Images reordered" });
  }

  return out;
}

/* ---------- Reading ---------- */

export function toActivity(d: ActivityDoc): Activity {
  return {
    id: d._id.toHexString(),
    developerId: d.developerId,
    developerName: d.developerName,
    projectId: d.projectId,
    projectName: d.projectName,
    propertyId: d.propertyId,
    type: d.type,
    source: d.source,
    actor: d.actor,
    field: d.field,
    description: d.description,
    previousValue: d.previousValue,
    newValue: d.newValue,
    createdAt: d.createdAt.toISOString(),
  };
}
