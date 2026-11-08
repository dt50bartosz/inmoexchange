// lib/server/developer/units.ts
// Units (homes) inside a development: one place that saves them, whoever does it (the developer in /promotor
// or an admin on its behalf). Callers pass a development they already checked belongs to `developer`;
// every query here is scoped again by developerId + developmentId.
import "server-only";
import { ObjectId, type AnyBulkWriteOperation } from "mongodb";
import { collections, ensureIndexes } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { recordActivitySafely, type ActivityEntry } from "@/lib/server/project-activity";
import { UNITS_MAX, type UnitStatus } from "@/lib/constants/developers";
import { bulkUnitsSchema, hasPlot, newUnitsErrors, newUnitsSchema, unitSchema, type NewUnitRow } from "@/lib/schemas/units";
import type { DevProjectDoc, DevUnitDoc, Unit } from "@/types/developers";
import { findProjectDoc, saveProject, stampOf, type ProjectWriter, type SaveProjectResult } from "./developments";

type Developer = { id: string; name: string };

/** Unit references are unique per development ignoring case ("3B" = "3b"); the same collation as the unique index. */
const REFERENCE_COLLATION = { locale: "es", strength: 2 } as const;

export function toUnit(d: DevUnitDoc): Unit {
  const { _id, createdAt, updatedAt, ...rest } = d;
  return { ...rest, id: _id.toHexString(), createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
}

/** The development's units, in the developer's own order (by reference, numbers sorted as numbers). */
export async function listUnits(developerId: string, developmentId: string): Promise<Unit[]> {
  const docs = await collections.devUnits.find({ developerId, developmentId }).toArray();
  const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" });
  return docs.sort((a, b) => collator.compare(a.reference, b.reference)).map(toUnit);
}

export async function findUnitDoc(id: unknown, developerId: string, developmentId: string) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  return collections.devUnits.findOne({ _id: new ObjectId(id), developerId, developmentId });
}

const context = (developer: Developer, development: DevProjectDoc, writer: ProjectWriter) => ({
  developerId: developer.id,
  developerName: developer.name,
  projectId: development._id.toHexString(),
  projectName: development.name,
  source: writer.source,
  actor: writer.actor,
});

const money = (n: number | null, currency: string) =>
  n === null ? "—" : `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(n)} ${currency}`;

/**
 * The development's price range, bedrooms, property types and counts, worked out from its units.
 * Prices of sold units don't count for the range. No units: the development goes back to its typed-in figures.
 */
export async function refreshDevelopmentSummary(development: DevProjectDoc) {
  const developmentId = development._id.toHexString();
  const units = await collections.devUnits.find({ developerId: development.developerId, developmentId }).toArray();
  if (units.length === 0) {
    await collections.devProjects.updateOne({ _id: development._id }, { $set: { summarySource: "manual" } });
    return;
  }
  const prices = units.filter((u) => u.status !== "sold" && u.price !== null).map((u) => u.price as number);
  const beds = units.map((u) => u.bedrooms);
  await collections.devProjects.updateOne(
    { _id: development._id, developerId: development.developerId },
    {
      $set: {
        summarySource: "units",
        priceFrom: prices.length ? Math.min(...prices) : null,
        priceTo: prices.length ? Math.max(...prices) : null,
        bedroomsMin: Math.min(...beds),
        bedroomsMax: Math.max(...beds),
        propertyTypes: [...new Set(units.map((u) => u.type))],
        unitsTotal: units.length,
        unitsAvailable: units.filter((u) => u.status === "available").length,
        lastUpdateAt: new Date(),
      },
    }
  );
}

export type SaveUnitResult = ActionResult<Unit, "validation_error" | "not_found" | "too_many">;

/** Creates (existing null) or updates one unit of `development`. Unchanged data writes nothing. */
export async function saveUnit(
  developer: Developer,
  development: DevProjectDoc,
  existing: DevUnitDoc | null,
  input: unknown,
  writer: ProjectWriter
): Promise<SaveUnitResult> {
  if (development.developerId !== developer.id) return fail("not_found");
  const developmentId = development._id.toHexString();
  if (existing && (existing.developerId !== developer.id || existing.developmentId !== developmentId)) return fail("not_found");
  const parsed = unitSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const v = parsed.data;

  if (!existing && (await collections.devUnits.countDocuments({ developmentId })) >= UNITS_MAX) return fail("too_many");
  const clash = await collections.devUnits.findOne(
    { developmentId, reference: v.reference, ...(existing ? { _id: { $ne: existing._id } } : {}) },
    { projection: { _id: 1 }, collation: REFERENCE_COLLATION }
  );
  if (clash) return fail("validation_error", { reference: "unit_reference_taken" });

  const now = new Date();
  const stamp = stampOf(writer.actor);
  const doc: DevUnitDoc = {
    ...v,
    _id: existing?._id ?? new ObjectId(),
    developerId: developer.id,
    developmentId,
    source: existing?.source ?? { kind: "manual" },
    createdBy: existing?.createdBy ?? stamp,
    updatedBy: stamp,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const entries = diffUnit(existing, doc, development.currency);
  if (existing && entries.length === 0) return ok(toUnit(existing));

  await ensureIndexes();
  try {
    if (existing) await collections.devUnits.replaceOne({ _id: doc._id, developerId: developer.id, developmentId }, doc);
    else await collections.devUnits.insertOne(doc);
  } catch (error) {
    // Two saves at once with the same reference: the unique index stops the second one
    if ((error as { code?: number }).code === 11000) return fail("validation_error", { reference: "unit_reference_taken" });
    throw error;
  }
  await recordActivitySafely(context(developer, development, writer), entries);
  await refreshDevelopmentSummary(development);
  return ok(toUnit(doc));
}

/**
 * "Nueva promoción" with its units table (developer panel and admin): the rows are checked BEFORE the development is
 * created, so a wrong row saves nothing and its error comes back as "units.<row>.<field>". Then the development, then the units.
 */
export async function createProjectWithUnits(
  developer: Developer,
  input: unknown,
  units: unknown,
  writer: ProjectWriter
): Promise<SaveProjectResult> {
  const rows = newUnitsSchema.safeParse(units ?? []);
  if (!rows.success) {
    const errors = Object.entries(newUnitsErrors(units ?? [])).map(([path, message]) => [`units${path ? `.${path}` : ""}`, message]);
    return fail("validation_error", Object.fromEntries(errors));
  }
  const saved = await saveProject(developer, null, input, writer);
  if (!saved.ok || rows.data.length === 0) return saved;

  const development = await findProjectDoc(saved.data.id, developer.id);
  try {
    if (development) await createUnitsForNewDevelopment(developer, development, rows.data, writer);
  } catch (error) {
    // The development exists: report success so the form isn't sent again (that would create a second development).
    // The developer lands on its page, where the Unidades tab shows what was saved and units can be added.
    console.error("[units] creating the new development's units failed", saved.data.id, error);
  }
  return saved;
}

/**
 * The units typed on "Nueva promoción", saved right after the development is created.
 * `rows` must already be valid (newUnitsSchema); the development is new, so no reference can clash with the database.
 * One activity entry per unit, and the development's summary is worked out once at the end.
 */
export async function createUnitsForNewDevelopment(developer: Developer, development: DevProjectDoc, rows: NewUnitRow[], writer: ProjectWriter) {
  if (development.developerId !== developer.id || rows.length === 0) return;
  const developmentId = development._id.toHexString();
  const now = new Date();
  const stamp = stampOf(writer.actor);
  const docs: DevUnitDoc[] = newUnitsSchema.parse(rows).map((r) => ({
    ...r,
    // Only types with their own plot keep a plot size (the table hides the field for the others)
    plotM2: hasPlot(r.type) ? (r.plotM2 ?? null) : null,
    terraceM2: null,
    orientation: "",
    status: "available",
    _id: new ObjectId(),
    developerId: developer.id,
    developmentId,
    source: { kind: "manual" },
    createdBy: stamp,
    updatedBy: stamp,
    createdAt: now,
    updatedAt: now,
  }));
  await ensureIndexes();
  await collections.devUnits.insertMany(docs, { ordered: true });
  await recordActivitySafely(context(developer, development, writer), docs.flatMap((d) => diffUnit(null, d, development.currency)));
  await refreshDevelopmentSummary(development);
}

/** "Unit 3B: price 250,000 EUR → 260,000 EUR" — one entry per unit save. */
function diffUnit(before: DevUnitDoc | null, after: DevUnitDoc, currency: string): ActivityEntry[] {
  if (!before) {
    return [{ type: "unit_added", field: "unit", description: `Unit added: ${after.reference}`, newValue: `${after.reference} · ${money(after.price, currency)} · ${after.status}` }];
  }
  const fields: (keyof DevUnitDoc)[] = ["reference", "type", "bedrooms", "bathrooms", "builtM2", "plotM2", "terraceM2", "floor", "orientation", "price", "status"];
  const changed = fields.filter((f) => JSON.stringify(before[f]) !== JSON.stringify(after[f]));
  if (!changed.length) return [];
  const show = (d: DevUnitDoc, f: keyof DevUnitDoc) => (f === "price" ? money(d.price, currency) : String(d[f] ?? "—"));
  return [
    {
      type: "unit_changed",
      field: changed.length === 1 ? `unit.${changed[0]}` : "unit",
      description: `Unit ${after.reference} changed (${changed.join(", ")})`,
      previousValue: changed.map((f) => `${f}: ${show(before, f)}`).join(" · "),
      newValue: changed.map((f) => `${f}: ${show(after, f)}`).join(" · "),
    },
  ];
}

export async function deleteUnit(developer: Developer, development: DevProjectDoc, unit: DevUnitDoc, writer: ProjectWriter) {
  const developmentId = development._id.toHexString();
  const res = await collections.devUnits.deleteOne({ _id: unit._id, developerId: developer.id, developmentId });
  if (!res.deletedCount) return;
  await recordActivitySafely(context(developer, development, writer), [
    { type: "unit_removed", field: "unit", description: `Unit removed: ${unit.reference}`, previousValue: unit.reference },
  ]);
  await refreshDevelopmentSummary(development);
}

export type BulkUnitsResult = ActionResult<{ changed: number }, "validation_error" | "not_found">;

/**
 * Bulk edit: status and/or price (a new price, or a % change rounded to whole euros) on the selected units.
 * Ids of other developments or developers are ignored. One history entry for the whole edit.
 */
export async function bulkUpdateUnits(developer: Developer, development: DevProjectDoc, input: unknown, writer: ProjectWriter): Promise<BulkUnitsResult> {
  if (development.developerId !== developer.id) return fail("not_found");
  const parsed = bulkUnitsSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const { ids, status, price } = parsed.data;
  const developmentId = development._id.toHexString();

  const units = await collections.devUnits
    .find({ _id: { $in: ids.map((id) => new ObjectId(id)) }, developerId: developer.id, developmentId })
    .toArray();
  const now = new Date();
  const stamp = stampOf(writer.actor);
  const newPrice = (u: DevUnitDoc) => {
    if (!price) return u.price;
    if (price.mode === "set") return price.value;
    return u.price === null ? null : Math.max(0, Math.round(u.price * (1 + price.value / 100)));
  };
  const ops: AnyBulkWriteOperation<DevUnitDoc>[] = [];
  for (const u of units) {
    const next: { status: UnitStatus; price: number | null } = { status: status ?? u.status, price: newPrice(u) };
    if (next.status === u.status && next.price === u.price) continue;
    ops.push({ updateOne: { filter: { _id: u._id, developerId: developer.id, developmentId }, update: { $set: { ...next, updatedBy: stamp, updatedAt: now } } } });
  }
  if (!ops.length) return ok({ changed: 0 });
  await collections.devUnits.bulkWrite(ops, { ordered: false });

  const what = [
    status && `status → ${status}`,
    price && (price.mode === "set" ? `price → ${money(price.value, development.currency)}` : `price ${price.value > 0 ? "+" : ""}${price.value}%`),
  ].filter(Boolean);
  await recordActivitySafely(context(developer, development, writer), [
    { type: "unit_changed", field: "units", description: `Bulk edit of ${ops.length} unit${ops.length === 1 ? "" : "s"}: ${what.join(", ")}` },
  ]);
  await refreshDevelopmentSummary(development);
  return ok({ changed: ops.length });
}
