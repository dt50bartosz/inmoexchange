// app/feeds/[file]/route.ts
// Public Kyero v3 feed for an export link: GET /feeds/<token>.xml (see feedUrl() in lib/constants/xmlExport.ts).
// Outside [locale] on purpose: portals and CRMs fetch this URL directly.
import { collections, ensureIndexes } from "@/lib/db";
import { buildKyeroXml, matchExport } from "@/lib/server/xml-exports";

export const dynamic = "force-dynamic";

/** "Last fetched" is saved at most this often, so portals polling the feed don't write to the database every time. */
const FETCH_LOG_INTERVAL_MS = 10 * 60 * 1000;

const notFound = () => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;

  // "<token>.xml" → token (only hex characters, so nothing odd ever reaches the database)
  const token = file.endsWith(".xml") ? file.slice(0, -4) : "";
  if (!/^[a-f0-9]{16,64}$/.test(token)) return notFound();

  await ensureIndexes(); // unique token
  const item = await collections.xmlExports.findOne({ token });
  if (!item) return notFound(); // deleted, or the link was replaced with a new one

  const matches = await matchExport(item.agencyId, item.filters);
  const xml = buildKyeroXml(matches.map((m) => m.property));

  const now = Date.now();
  if (!item.lastFetchedAt || now - item.lastFetchedAt.getTime() > FETCH_LOG_INTERVAL_MS) {
    await collections.xmlExports.updateOne({ _id: item._id }, { $set: { lastFetchedAt: new Date(now) } });
  }

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cached for 5 minutes on Vercel's CDN: fast for portals, and a deleted or replaced link stops working within 5 minutes
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
      "X-Robots-Tag": "noindex",
    },
  });
}
