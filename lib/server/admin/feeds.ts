// lib/server/admin/feeds.ts
// Read helpers for Admin → Feeds. Plain server functions: only server pages can call them.
import "server-only";
import { collections } from "@/lib/db";
import { toFeed } from "@/lib/server/feeds";
import type { AdminFeed } from "@/types/admin";
import type { FeedDoc } from "@/types/feed";
import { requireAdmin } from "./current-admin";

export const toAdminFeed = (d: FeedDoc): AdminFeed => ({ ...toFeed(d), agencyId: d.agencyId });

/** Every agency's import feed. */
export async function listAllFeeds(): Promise<AdminFeed[]> {
  await requireAdmin();
  const docs = await collections.feeds.find().sort({ createdAt: 1 }).toArray();
  return docs.map(toAdminFeed);
}
