// lib/server/property-events.ts
// Views and clicks on properties (network search, client pages, public listings), and the numbers for the panel dashboard.
import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { MongoServerError, ObjectId, type Document, type Filter } from "mongodb";
import { auth, roleOf, sessionIsCurrent } from "@/lib/auth";
import { collections, ensureIndexes } from "@/lib/db";
import { findLivePage } from "@/lib/server/client-pages";
import { getAgencyId } from "@/lib/server/current-agency";
import { blockedAgencyIds, networkFilter, publicFilter } from "@/lib/server/network";
import type {
  DashboardViewer,
  PanelDashboard,
  PropertyEventSource,
  PropertyEventType,
  PropertyStats,
  PropertyStatsSummary,
  StatBreakdown,
} from "@/types/property-events";

/** Days the dashboard looks back. */
export const DASHBOARD_DAYS = 30;

/** Today in Spain as YYYY-MM-DD ("sv-SE" formats dates that way). */
const madridDay = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/** Crawlers, link previews and scripts. Real browsers always send a user agent. */
const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|skype|headless|lighthouse|pagespeed|curl|wget|python|java\/|axios|node-fetch|undici|go-http|okhttp|postman|insomnia/i;

/** Which page the event comes from, and how to find the property there. */
export type EventTarget =
  | { source: "network"; propertyId: string }
  | { source: "public"; code: string }
  | { source: "microsite"; token: string; propertyId: string };

/**
 * Who is looking, without requiring a login (public and client pages have none).
 * Admins are not counted at all; agency and developer logins count as their organisation.
 */
async function currentViewer(): Promise<{ agencyId: string | null } | "skip"> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || !ObjectId.isValid(id) || !(await sessionIsCurrent(session.user))) return { agencyId: null };
  const user = await collections.users.findOne({ _id: new ObjectId(id) }, { projection: { role: 1, agencyId: 1 } });
  if (!user) return { agencyId: null };
  if (roleOf(user) === "admin") return "skip";
  return { agencyId: user.agencyId && ObjectId.isValid(user.agencyId) ? user.agencyId : null };
}

/** The property, only if this visitor can really see it on that page; and on client pages, whose page it is. */
async function findTarget(target: EventTarget, viewerAgencyId: string | null) {
  const projection = { agencyId: 1, code: 1, reference: 1 };
  if (target.source === "public") {
    const doc = await collections.properties.findOne({ ...publicFilter(await blockedAgencyIds()), code: target.code }, { projection });
    return doc && { doc, micrositeAgencyId: null };
  }
  if (!ObjectId.isValid(target.propertyId)) return null;
  const _id = new ObjectId(target.propertyId);

  if (target.source === "network") {
    if (!viewerAgencyId) return null; // the network search is for logged-in agencies only
    const filter: Filter<Document> = { _id, ...networkFilter(viewerAgencyId, await blockedAgencyIds(), true) };
    const doc = await collections.properties.findOne(filter, { projection });
    return doc && { doc, micrositeAgencyId: null };
  }

  const found = await findLivePage(target.token);
  if (!found || !found.page.items.some((i) => i.propertyId === target.propertyId)) return null;
  if (viewerAgencyId === found.page.agencyId) return null; // the agent previewing their own client page
  const doc = await collections.properties.findOne({ _id }, { projection });
  return doc && { doc, micrositeAgencyId: found.page.agencyId };
}

/**
 * Saves a view or click: at most one per type, property, visitor and day (Madrid time).
 * Not counted: bots, admins, the agency that owns the property, the agent on their own client page,
 * and properties the visitor can't see on that page. Never throws: stats must never break a page.
 */
export async function recordEvent(type: PropertyEventType, target: EventTarget): Promise<void> {
  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    if (!ua || BOT_UA.test(ua)) return;

    const viewer = await currentViewer();
    if (viewer === "skip") return;
    const found = await findTarget(target, viewer.agencyId);
    if (!found) return;
    const { doc, micrositeAgencyId } = found;
    const ownerAgencyId = String(doc.agencyId);
    if (ownerAgencyId === viewer.agencyId) return;

    const now = new Date();
    const day = madridDay(now);
    let visitorKey: string;
    if (viewer.agencyId) visitorKey = `a:${viewer.agencyId}`;
    else {
      const secret = process.env.AUTH_SECRET;
      if (!secret) return; // can't make an anonymous key without it; the login doesn't work without it either
      const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
      visitorKey = `v:${createHmac("sha256", secret).update(`${ip}|${ua}|${day}`).digest("hex").slice(0, 32)}`;
    }

    await ensureIndexes(); // unique (type, property, visitor, day)
    await collections.propertyEvents.updateOne(
      { type, propertyId: doc._id.toHexString(), visitorKey, day },
      {
        $set: { lastAt: now, reference: String(doc.code ?? doc.reference ?? "") },
        $setOnInsert: { source: target.source, ownerAgencyId, viewerAgencyId: viewer.agencyId, micrositeAgencyId, createdAt: now },
      },
      { upsert: true }
    );
  } catch (err) {
    // Two requests at the same moment can race on the upsert; the other one already counted it
    if (err instanceof MongoServerError && err.code === 11000) return;
    console.error(`[property-events] ${type} not recorded`, err);
  }
}

/** "Show contact" in the network search (panel). */
export const recordContact = (propertyId: string) => recordEvent("contact", { source: "network", propertyId });

/** The Madrid day `n` days before today ("last 30 days" = from daysAgo(29) to today, both included). */
// Counts on the calendar date itself (UTC arithmetic on "YYYY-MM-DD"), so clock changes never skip or repeat a day
const daysAgo = (n: number, now = new Date()) => {
  const d = new Date(`${madridDay(now)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

/**
 * Views and WhatsApp clicks (last 30 days and all time), grouped by property or by owner agency, in one query.
 * `ownerAgencyId` limits it to one agency (index owner_newest); without it, the whole platform (admin only:
 * callers check). Used by the agency's list and by the admin lists, so they always count the same way.
 */
export async function countEvents(
  by: "property" | "agency",
  ownerAgencyId?: string,
  now = new Date()
): Promise<PropertyStatsSummary> {
  const from30 = daysAgo(DASHBOARD_DAYS - 1, now);
  const count = (type: PropertyEventType, recent: boolean) => ({
    $sum: { $cond: [recent ? { $and: [{ $eq: ["$type", type] }, { $gte: ["$day", from30] }] } : { $eq: ["$type", type] }, 1, 0] },
  });
  const rows = await collections.propertyEvents
    .aggregate<{ _id: string; views: number; views30: number; whatsapp: number; whatsapp30: number }>([
      { $match: { ...(ownerAgencyId !== undefined ? { ownerAgencyId } : {}), type: { $in: ["view", "whatsapp_click"] } } },
      {
        $group: {
          _id: by === "property" ? "$propertyId" : "$ownerAgencyId",
          views: count("view", false),
          views30: count("view", true),
          whatsapp: count("whatsapp_click", false),
          whatsapp30: count("whatsapp_click", true),
        },
      },
    ])
    .toArray();
  return Object.fromEntries(rows.map(({ _id, ...n }) => [_id, n]));
}

/** Per property, for one agency's "Mis propiedades" list. The caller passes the agency from the session. */
export const getStatsSummary = (agencyId: string, now = new Date()) => countEvents("property", agencyId, now);

const SOURCES: PropertyEventSource[] = ["network", "microsite", "public"];
const emptyBreakdown = (): StatBreakdown => ({
  total: { d7: 0, d30: 0, all: 0 },
  bySource: Object.fromEntries(SOURCES.map((s) => [s, { d7: 0, d30: 0, all: 0 }])) as StatBreakdown["bySource"],
});

/**
 * Views and WhatsApp clicks of one property: 7 / 30 days / all time per source, and views per day for 30 days.
 * Only counts events owned by `agencyId` (the caller passes the agency from the session and checks the property).
 */
export async function getPropertyStats(agencyId: string, propertyId: string, now = new Date()): Promise<PropertyStats> {
  const from7 = daysAgo(6, now);
  const from30 = daysAgo(DASHBOARD_DAYS - 1, now);
  const rows = await collections.propertyEvents
    .aggregate<{ _id: { type: PropertyEventType; source: PropertyEventSource; day: string }; n: number }>([
      { $match: { propertyId, ownerAgencyId: agencyId, type: { $in: ["view", "whatsapp_click"] } } },
      { $group: { _id: { type: "$type", source: "$source", day: "$day" }, n: { $sum: 1 } } },
    ])
    .toArray();

  const stats: PropertyStats = { views: emptyBreakdown(), whatsapp: emptyBreakdown(), daily: [] };
  const perDay = new Map<string, number>();
  for (const { _id, n } of rows) {
    const b = _id.type === "view" ? stats.views : stats.whatsapp;
    const s = b.bySource[_id.source];
    if (!s) continue; // unknown source in old data: left out of the split and the total alike
    for (const p of [s, b.total]) {
      p.all += n;
      if (_id.day >= from30) p.d30 += n;
      if (_id.day >= from7) p.d7 += n;
    }
    if (_id.type === "view" && _id.day >= from30) perDay.set(_id.day, (perDay.get(_id.day) ?? 0) + n);
  }
  for (let i = DASHBOARD_DAYS - 1; i >= 0; i--) {
    const day = daysAgo(i, now);
    stats.daily.push({ day, views: perDay.get(day) ?? 0 });
  }
  return stats;
}

/** The current agency's dashboard: active properties, and who viewed / contacted them lately. */
export async function getPanelDashboard(): Promise<PanelDashboard> {
  const agencyId = await getAgencyId();
  const since = new Date(Date.now() - DASHBOARD_DAYS * 24 * 3600e3);
  const events = collections.propertyEvents;

  const [activeCount, viewsCount, contactsCount, byAgency] = await Promise.all([
    collections.properties.countDocuments({ agencyId, status: "active" }),
    events.countDocuments({ ownerAgencyId: agencyId, type: "view", lastAt: { $gte: since } }),
    events.countDocuments({ ownerAgencyId: agencyId, type: "contact", lastAt: { $gte: since } }),
    events
      .aggregate<{ _id: string; views: number; lastAt: Date; reference: string }>([
        // Only logged-in agencies: anonymous visitors (clients, public) have no agency to show
        { $match: { ownerAgencyId: agencyId, type: "view", lastAt: { $gte: since }, viewerAgencyId: { $type: "string" } } },
        { $sort: { lastAt: -1 } },
        { $group: { _id: "$viewerAgencyId", views: { $sum: 1 }, lastAt: { $first: "$lastAt" }, reference: { $first: "$reference" } } },
        { $sort: { lastAt: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
  ]);

  const ids = byAgency.map((v) => v._id).filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const agencies = await collections.agencies.find({ _id: { $in: ids } }, { projection: { name: 1, logo: 1 } }).toArray();
  const byId = new Map(agencies.map((a) => [a._id.toHexString(), a]));

  const viewers: DashboardViewer[] = byAgency.map((v) => ({
    id: v._id,
    name: byId.get(v._id)?.name ?? "Deleted agency",
    logo: byId.get(v._id)?.logo ?? null,
    views: v.views,
    lastPropertyRef: v.reference,
    lastViewedAt: v.lastAt.toISOString(),
  }));

  return { activeCount, viewsCount, contactsCount, viewers };
}
