import "server-only";
import { getDb } from "@/lib/db";

type RateLimitDoc = { _id: string; count: number; expiresAt: Date };

/**
 * Fixed-window counter stored in MongoDB.
 * Returns true if the call is allowed, false if the limit is reached.
 * Old windows expire through the TTL index on `expiresAt` (see scripts/create-indexes.ts).
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const db = await getDb();
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);

  const doc = await db.collection<RateLimitDoc>("rateLimits").findOneAndUpdate(
    { _id: `${key}:${bucket}` },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date((bucket + 2) * windowSeconds * 1000) },
    },
    { upsert: true, returnDocument: "after" },
  );

  return (doc?.count ?? 1) <= limit;
}
