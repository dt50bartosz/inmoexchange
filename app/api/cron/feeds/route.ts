// app/api/cron/feeds/route.ts
// Daily feed sync, called by Vercel Cron (see vercel.json).
// Vercel sends "Authorization: Bearer <CRON_SECRET>"; anything else gets 401.
import { collections } from "@/lib/db";
import { importFeed } from "@/lib/server/feed-import";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds (Vercel Pro; Hobby is capped at 60)

/** A feed synced less than this long ago is skipped (cron times drift a little). */
const MIN_AGE_MS = 20 * 3600e3;
/** A feed still "syncing" after this long was cut off by a timeout; try it again. */
const STUCK_MS = 3600e3;
/** Stop starting new imports after this; the rest wait for tomorrow (oldest first). */
const BUDGET_MS = (maxDuration - 40) * 1000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const started = Date.now();
  const now = new Date();

  // Suspended or cancelled agencies' feeds are not synced
  const blocked = await collections.agencies
    .find({ status: { $in: ["suspended", "cancelled"] } }, { projection: { _id: 1 } })
    .toArray();

  const due = await collections.feeds
    .find({
      agencyId: { $nin: blocked.map((a) => a._id.toHexString()) },
      $and: [
        { $or: [{ status: { $in: ["active", "error"] } }, { status: "syncing", updatedAt: { $lt: new Date(now.getTime() - STUCK_MS) } }] },
        { $or: [{ lastSyncAt: null }, { lastSyncAt: { $lt: new Date(now.getTime() - MIN_AGE_MS) } }] },
      ],
    })
    .sort({ lastSyncAt: 1 }) // never-synced (null) first, then the oldest
    .toArray();

  let synced = 0;
  let failed = 0;
  for (const feed of due) {
    if (Date.now() - started > BUDGET_MS) break;
    const result = await importFeed(feed);
    if (result.ok) synced++;
    else failed++;
  }

  const left = due.length - synced - failed;
  console.log(`[cron/feeds] due=${due.length} synced=${synced} failed=${failed} left=${left}`);
  return Response.json({ due: due.length, synced, failed, left });
}
