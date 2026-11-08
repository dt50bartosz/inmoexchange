// app/[locale]/panel/mis-propiedades/server/actions.ts
"use server";

import { MongoServerError, ObjectId } from "mongodb";
import { collections, ensureIndexes } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { feedPropertiesFilter, findFeed, scopedFeed, toFeed } from "@/lib/server/feeds";
import { checkKyeroFeed } from "@/lib/server/kyero";
import { importFeed, type ImportSummary } from "@/lib/server/feed-import";
import { findProperty, scopedProperty, toProperty } from "@/lib/server/properties";
import { deletePrefix } from "@/lib/server/storage";
import { PROPERTIES_PREFIX } from "@/lib/images/config";
import { feedSchema, type Feed } from "@/lib/schemas/feed";
import type { Property } from "@/lib/schemas/property";
import type { FeedDoc } from "@/types/feed";
import type { PropertyStats, PropertyStatsSummary } from "@/types/property-events";
import { getPropertyStats, getStatsSummary } from "@/lib/server/property-events";
import { z } from "zod";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { geocode } from "@/lib/server/geocoding";
import { townCentre } from "@/lib/server/locations";

/*
 * Actions for the "Mis propiedades" page: the agency's properties and its XML feeds.
 * The agency always comes from getAgencyId() on the server, never from the browser.
 * Importing properties is done by importFeed() in lib/server/feed-import.ts.
 */

export type FeedError =
  | "validation_error"
  | "not_found"
  | "paused"
  | "unreachable"
  | "not_kyero"
  | "blocked"
  | "too_large"
  | "import_failed";
export type FeedResult<T = Feed> = ActionResult<T, FeedError>;

const col = collections.feeds;

/* ---------- Properties ---------- */

/** All of the agency's properties (manual and from feeds), newest first. */
export async function getProperties(): Promise<ActionResult<Property[]>> {
  const agencyId = await getAgencyId();
  const docs = await collections.properties.find({ agencyId }).sort({ createdAt: -1 }).toArray();
  return ok(docs.map(toProperty));
}

/** Views and WhatsApp clicks per property (last 30 days and all time), for the list. */
export async function getPropertyStatsSummary(): Promise<ActionResult<PropertyStatsSummary>> {
  const agencyId = await getAgencyId();
  return ok(await getStatsSummary(agencyId));
}

/** The stats card on the edit page. Only for the agency's own properties. */
export async function getPropertyStatsAction(id: string): Promise<ActionResult<PropertyStats, "not_found">> {
  const doc = await findProperty(id);
  if (!doc) return fail("not_found");
  return ok(await getPropertyStats(String(doc.agencyId), doc._id.toHexString()));
}

/** One of the agency's properties, for the edit page. */
export async function getProperty(id: string): Promise<ActionResult<Property, "not_found">> {
  const doc = await findProperty(id);
  return doc ? ok(toProperty(doc)) : fail("not_found");
}

/** Hides a property from the network (or shows it again). Works for manual and feed properties. */
export async function setPropertyHidden(id: string, hidden: boolean): Promise<ActionResult<Property, "not_found">> {
  const doc = await findProperty(id);
  if (!doc) return fail("not_found");

  const saved = await collections.properties.findOneAndUpdate(
    scopedProperty(String(doc.agencyId), doc._id),
    { $set: { hidden, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return saved ? ok(toProperty(saved)) : fail("not_found");
}

/**
 * Deletes a manual property and its photos in R2.
 * Feed properties can't be deleted here (the next sync would bring them back): hide them,
 * or remove them from the agency's own feed.
 */
export async function deleteProperty(id: string): Promise<ActionResult<null, "not_found" | "from_feed">> {
  const doc = await findProperty(id);
  if (!doc) return fail("not_found");
  if (doc.source?.kind === "feed") return fail("from_feed");

  const agencyId = String(doc.agencyId);
  await collections.properties.deleteOne(scopedProperty(agencyId, doc._id));
  // Photos are deleted after the property, so a failure here never leaves a property without photos
  await deletePrefix(`${PROPERTIES_PREFIX}/${agencyId}/${doc._id.toHexString()}/`).catch((e) =>
    console.error("deleteProperty: photo cleanup failed", e)
  );
  return ok(null);
}

/* ---------- Feeds ---------- */

/** All of the agency's feeds, oldest first. */
export async function getFeeds(): Promise<FeedResult<Feed[]>> {
  const agencyId = await getAgencyId();
  await ensureIndexes();
  const docs = await col.find(scopedFeed(agencyId)).sort({ createdAt: 1 }).toArray();
  return ok(docs.map(toFeed));
}

/** Downloads the URL and checks it's a Kyero feed. Returns how many properties it lists. */
export async function testFeed(url: unknown): Promise<FeedResult<{ count: number }>> {
  const parsed = feedSchema.shape.url.safeParse(url);
  if (!parsed.success) return fail("validation_error", { url: parsed.error.issues[0].message });

  const check = await checkKyeroFeed(parsed.data);
  return check.ok ? ok({ count: check.count }) : fail(check.reason);
}

/** Saves a new feed after checking the URL really is a Kyero feed, then imports its properties right away. */
export async function addFeed(input: unknown): Promise<FeedResult> {
  const parsed = feedSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));

  const check = await checkKyeroFeed(parsed.data.url);
  if (!check.ok) return fail(check.reason);

  const now = new Date();
  const doc: FeedDoc = {
    _id: new ObjectId(),
    agencyId: await getAgencyId(),
    ...parsed.data,
    status: "active",
    propertyCount: 0, // filled in by the import below
    lastSyncAt: null,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };

  await ensureIndexes(); // unique { agencyId, url }
  try {
    await col.insertOne(doc);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return fail("validation_error", { url: "feed_exists" });
    }
    throw error;
  }

  // First import, using the feed we already downloaded. If it fails, the feed is saved with status "error".
  await importFeed(doc, check.properties);
  const saved = await col.findOne({ _id: doc._id });
  return ok(toFeed(saved ?? doc));
}

/** "Sync now": imports the feed again and returns the updated feed plus what changed. */
export async function syncFeed(id: string): Promise<FeedResult<{ feed: Feed; summary: ImportSummary }>> {
  const feed = await findFeed(id);
  if (!feed) return fail("not_found");
  if (feed.status === "paused") return fail("paused");

  const result = await importFeed(feed);
  if (!result.ok) return fail(result.reason);

  const saved = await col.findOne(scopedFeed(feed.agencyId, feed._id));
  if (!saved) return fail("not_found");
  const { created, updated, deleted, skipped } = result;
  return ok({ feed: toFeed(saved), summary: { created, updated, deleted, skipped } });
}

/** Pauses or resumes automatic syncing. */
export async function setFeedPaused(id: string, paused: boolean): Promise<FeedResult> {
  const feed = await findFeed(id);
  if (!feed) return fail("not_found");

  const status = paused ? "paused" : feed.lastError ? "error" : "active";
  const saved = await col.findOneAndUpdate(
    scopedFeed(feed.agencyId, feed._id),
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return saved ? ok(toFeed(saved)) : fail("not_found");
}

/**
 * Deletes a feed. Its imported properties are either removed, or kept as manual properties.
 * Feed photos are links (not stored in R2), so there is nothing to delete in storage.
 */
export async function deleteFeed(id: string, properties: "keep" | "remove"): Promise<FeedResult<null>> {
  const feed = await findFeed(id);
  if (!feed) return fail("not_found");

  const imported = feedPropertiesFilter(feed.agencyId, feed._id.toHexString());
  if (properties === "remove") {
    await collections.properties.deleteMany(imported);
  } else {
    await collections.properties.updateMany(imported, {
      $set: { source: { kind: "manual" }, hidden: false, updatedAt: new Date() },
    });
  }

  await col.deleteOne(scopedFeed(feed.agencyId, feed._id));
  return ok(null);
}

/* ---------- Coordinates (add / edit property form) ---------- */

export type CoordinatesError = "validation_error" | "not_found" | "unavailable" | "rate_limited";
const placeText = z.object({ town: z.string().trim().min(1).max(100), province: z.string().trim().max(100), address: z.string().trim().max(200).default("") });

/** Geocoder calls cost the provider's goodwill: a generous cap per agency (cached answers count too). */
async function withinGeocodeLimit() {
  return consumeRateLimit(`geocode:${await getAgencyId()}`, 60, 10 * 60);
}

/** Centre of a town (our location data, else the geocoder): fills empty coordinates and gives the distance. */
export async function townCentreAction(input: unknown): Promise<ActionResult<{ lat: number; lng: number; source: "database" | "geocoder" }, CoordinatesError>> {
  const parsed = placeText.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  if (!(await withinGeocodeLimit())) return fail("rate_limited");
  const centre = await townCentre(parsed.data.town, parsed.data.province);
  return centre ? ok(centre) : fail("not_found");
}

/** The property's own point from its street address (geocoder, cached). Never falls back to the town silently. */
export async function geocodeAddressAction(input: unknown): Promise<ActionResult<{ lat: number; lng: number; label: string }, CoordinatesError>> {
  const parsed = placeText.extend({ address: z.string().trim().min(1).max(200) }).safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  if (!(await withinGeocodeLimit())) return fail("rate_limited");
  const { address, town, province } = parsed.data;
  const found = await geocode([address, town, province, "España"].filter(Boolean).join(", "));
  return found.ok ? ok(found.result) : fail(found.error);
}
