// lib/server/platform-events.ts
// Platform activity log for the admin (collection "platform_events"): logins and account events across every
// agency and developer. Append-only, like project_activity (which keeps the per-development change history).
// Recording never throws: a logging problem must never break a login or an admin action.
import "server-only";
import { ObjectId, type Filter } from "mongodb";
import { collections } from "@/lib/db";
import type { PlatformEvent, PlatformEventDoc, PlatformEventType, PlatformOrgType } from "@/types/platform-events";
import type { UserRole } from "@/types/models";

type Org = { id: string; name: string; type: PlatformOrgType } | null;
type Actor = PlatformEventDoc["actor"];

/** The organisation by id (name and agency/developer), or null if it no longer exists. */
export async function orgOf(id: string | null | undefined): Promise<Org> {
  if (!id || !ObjectId.isValid(id)) return null;
  const a = await collections.agencies.findOne({ _id: new ObjectId(id) }, { projection: { name: 1, accountType: 1 } });
  return a ? { id, name: a.name, type: a.accountType === "developer" ? "developer" : "agency" } : null;
}

/** Same, from an agencies document already loaded. */
export const orgFromDoc = (a: { _id: ObjectId; name: string; accountType?: string }): Org => ({
  id: a._id.toHexString(),
  name: a.name,
  type: a.accountType === "developer" ? "developer" : "agency",
});

export async function recordPlatformEvent(type: PlatformEventType, org: Org, actor: Actor, description: string) {
  try {
    await collections.platformEvents.insertOne({
      _id: new ObjectId(),
      type,
      orgId: org?.id ?? null,
      orgName: org?.name ?? "",
      orgType: org?.type ?? null,
      actor,
      description,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("recordPlatformEvent failed", type, e);
  }
}

/** An admin did something to an account. `admin` comes from requireAdmin(). */
export async function recordAdminEvent(admin: { id: string; email: string }, type: PlatformEventType, org: Org, description: string) {
  await recordPlatformEvent(type, org, { role: "admin", userId: admin.id, email: admin.email }, description);
}

/** A login (or a refused one) by any user. */
export async function recordLoginEvent(user: { _id: ObjectId; email: string; agencyId?: string | null }, role: UserRole, refused?: string) {
  const org = role === "admin" ? null : await orgOf(user.agencyId).catch(() => null);
  await recordPlatformEvent(
    refused ? "login_refused" : "login",
    org,
    { role, userId: user._id.toHexString(), email: user.email },
    refused ? `Login refused: ${refused}` : role === "admin" ? "Admin logged in" : "Logged in"
  );
}

/* ---------- Reading (admin only: callers check requireAdmin) ---------- */

export type PlatformEventFilters = { type?: string; orgType?: string; actor?: string; q?: string; orgId?: string; days?: number };

export const PLATFORM_EVENTS_PAGE_SIZE = 50;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function listPlatformEvents(f: PlatformEventFilters, page: number): Promise<{ items: PlatformEvent[]; total: number }> {
  const query: Filter<PlatformEventDoc> = {};
  if (f.type) query.type = f.type as PlatformEventType;
  if (f.orgType === "agency" || f.orgType === "developer") query.orgType = f.orgType;
  if (f.orgType === "none") query.orgType = null;
  if (f.actor === "admin" || f.actor === "agency" || f.actor === "developer") query["actor.role"] = f.actor;
  if (f.orgId) query.orgId = f.orgId;
  if (f.days) query.createdAt = { $gte: new Date(Date.now() - f.days * 86_400_000) };
  if (f.q?.trim()) {
    const re = new RegExp(escape(f.q.trim()), "i");
    query.$or = [{ orgName: re }, { "actor.email": re }, { description: re }];
  }
  const [docs, total] = await Promise.all([
    collections.platformEvents
      .find(query)
      .sort({ createdAt: -1 })
      .skip(Math.max(0, page - 1) * PLATFORM_EVENTS_PAGE_SIZE)
      .limit(PLATFORM_EVENTS_PAGE_SIZE)
      .toArray(),
    collections.platformEvents.countDocuments(query),
  ]);
  return { items: docs.map(toPlatformEvent), total };
}

export const toPlatformEvent = (d: PlatformEventDoc): PlatformEvent => ({
  id: d._id.toHexString(),
  type: d.type,
  orgId: d.orgId,
  orgName: d.orgName,
  orgType: d.orgType,
  actor: d.actor,
  description: d.description,
  createdAt: d.createdAt.toISOString(),
});
