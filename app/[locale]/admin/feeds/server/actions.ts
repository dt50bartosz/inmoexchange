// app/[locale]/admin/feeds/server/actions.ts
"use server";

import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { toAdminFeed } from "@/lib/server/admin/feeds";
import { importFeed } from "@/lib/server/feed-import";
import type { AdminFeed } from "@/types/admin";

/**
 * Admin → Feeds → "Sync now": imports any agency's feed (the same import the agency's own button runs).
 * Returns the feed afterwards, also when the import failed, so the admin sees the error.
 */
export async function adminSyncFeedAction(id: string): Promise<ActionResult<{ feed: AdminFeed; synced: boolean }, "not_found" | "paused">> {
  await requireAdmin();
  if (!ObjectId.isValid(id)) return fail("not_found");
  const feed = await collections.feeds.findOne({ _id: new ObjectId(id) });
  if (!feed) return fail("not_found");
  if (feed.status === "paused") return fail("paused");

  const result = await importFeed(feed);
  const saved = await collections.feeds.findOne({ _id: feed._id });
  if (!saved) return fail("not_found");
  return ok({ feed: toAdminFeed(saved), synced: result.ok });
}
