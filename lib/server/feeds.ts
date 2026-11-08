// lib/server/feeds.ts
// Helpers for the feed server actions.
import "server-only";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { getAgencyId } from "@/lib/server/current-agency";
import type { Feed } from "@/lib/schemas/feed";
import type { FeedDoc } from "@/types/feed";

/** Filter: this agency's feeds (optionally one feed). */
export function scopedFeed(agencyId: string, _id?: ObjectId) {
  return { agencyId, ...(_id ? { _id } : {}) };
}

/** Finds one of the current agency's feeds by id, or null. */
export async function findFeed(id: unknown) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  const agencyId = await getAgencyId();
  return collections.feeds.findOne(scopedFeed(agencyId, new ObjectId(id)));
}

/** Filter for the properties imported from one feed. */
export function feedPropertiesFilter(agencyId: string, feedId: string) {
  return { agencyId, "source.kind": "feed", "source.feedId": feedId };
}

/** Database document → the plain object the browser uses. */
export function toFeed(d: FeedDoc): Feed {
  return {
    id: d._id.toHexString(),
    name: d.name,
    url: d.url,
    status: d.status,
    propertyCount: d.propertyCount,
    lastSyncAt: d.lastSyncAt?.toISOString() ?? null,
    lastError: d.lastError,
  };
}