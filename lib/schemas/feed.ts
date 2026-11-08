import { z } from "zod";
import { RE, V } from "./shared";

// Only Kyero XML feeds in v1, synced automatically once every 24 hours.

export const FEED_STATUSES = ["active", "paused", "syncing", "error"] as const;

/** Add-feed form. */
export const feedSchema = z.object({
  name: z.string().trim().min(1, V.required).max(60, V.tooLong),
  url: z.string().trim().min(1, V.required).regex(RE.url, V.url),
});

/** Stored feed, as the browser sees it. */
export const feedRecordSchema = feedSchema.extend({
  id: z.string(),
  status: z.enum(FEED_STATUSES),
  lastSyncAt: z.string().nullable(),
  propertyCount: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
});

export type FeedFormValues = z.infer<typeof feedSchema>;
export type Feed = z.infer<typeof feedRecordSchema>;
export type FeedStatus = (typeof FEED_STATUSES)[number];