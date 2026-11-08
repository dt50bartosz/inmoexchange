// lib/server/admin/developers.ts
// Helpers for the admin "Developer CRM" pages. Plain server functions (not actions): only server code can call them.
// A developer is an agency (collection "agencies") with accountType "developer".
import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import type { z } from "zod";
import { collections, ensureIndexes } from "@/lib/db";
import { freshness, STALE_DAYS, type DeveloperStatus } from "@/lib/constants/developers";
import type { newDeveloperSchema } from "@/lib/schemas/developers";
import type {
  Activity,
  AdminOption,
  Developer,
  DeveloperContact,
  DeveloperCrmStats,
  DeveloperNote,
  DeveloperRow,
  ProjectRow,
} from "@/types/developers";
import type { AgencyDoc, UserDoc } from "@/types/models";
import type { EmailResult } from "@/lib/server/email";
import { toActivity } from "@/lib/server/project-activity";
import { daysSince, listProjects } from "@/lib/server/developer/developments";
import { sendLoginDetails, uniqueSlug } from "./agencies";
import { requireAdmin } from "./current-admin";

export const DEVELOPER_FILTER = { accountType: "developer" as const };

type LoginInfo = Pick<UserDoc, "email" | "lastLoginAt"> | null | undefined;

function developerStatus(a: AgencyDoc, user: LoginInfo): DeveloperStatus {
  if (a.status === "suspended" || a.status === "cancelled") return "inactive";
  return user?.lastLoginAt ? "active" : "pending";
}

const latest = (...dates: (Date | null | undefined)[]) =>
  dates.reduce<Date | null>((best, d) => (d && (!best || d > best) ? d : best), null);

/** Agency + login + numbers → the developer the CRM shows. */
function toDeveloper(
  a: AgencyDoc,
  user: LoginInfo,
  extra: { projectCount: number; propertyCount: number; lastProjectUpdateAt: Date | null; managers: Map<string, string> },
  now: number
): Developer {
  const lastActivity = latest(a.lastActivityAt, user?.lastLoginAt);
  const daysProject = extra.lastProjectUpdateAt ? daysSince(extra.lastProjectUpdateAt, now) : null;
  const daysActivity = lastActivity ? daysSince(lastActivity, now) : null;
  const managerId = a.relationshipManagerId ?? null;
  return {
    id: a._id.toHexString(),
    name: a.name,
    legalName: a.legalName ?? "",
    logo: a.logo ?? null,
    cif: a.cif ?? "",
    country: a.country ?? "",
    town: a.town ?? "",
    street: a.street ?? "",
    postcode: a.postcode ?? "",
    province: a.province ?? "",
    website: a.website ?? "",
    email: a.email ?? user?.email ?? "",
    contactEmail: a.contactEmail ?? "",
    phone: a.phone ?? "",
    contactPerson: a.contactPerson ?? "",
    contactPosition: a.contactPosition ?? "",
    regions: a.regions ?? [],
    description: { es: a.description?.es ?? "", en: a.description?.en ?? "" },
    status: developerStatus(a, user),
    accountStatus: a.status ?? "active",
    createdAt: a.createdAt.toISOString(),
    lastLoginAt: user?.lastLoginAt?.toISOString() ?? null,
    lastActivityAt: lastActivity?.toISOString() ?? null,
    lastProjectUpdateAt: extra.lastProjectUpdateAt?.toISOString() ?? null,
    daysSinceProjectUpdate: daysProject,
    daysSinceActivity: daysActivity,
    // Projects decide the colour; a developer without projects is judged by any activity
    freshness: freshness(daysProject ?? daysActivity),
    relationshipManager: managerId && extra.managers.has(managerId) ? { id: managerId, email: extra.managers.get(managerId)! } : null,
    projectCount: extra.projectCount,
    propertyCount: extra.propertyCount,
  };
}

/** Admin logins, for the relationship manager picker. */
export async function listAdmins(): Promise<AdminOption[]> {
  await requireAdmin();
  const users = await collections.users.find({ role: "admin" }, { projection: { email: 1 } }).sort({ email: 1 }).toArray();
  return users.map((u) => ({ id: u._id.toHexString(), email: u.email }));
}

async function managerEmails() {
  const users = await collections.users.find({ role: "admin" }, { projection: { email: 1 } }).toArray();
  return new Map(users.map((u) => [u._id.toHexString(), u.email]));
}

/* ---------- Main CRM page ---------- */

/** Every developer with its projects, plus the dashboard numbers. */
export async function getDeveloperCrm(): Promise<{ rows: DeveloperRow[]; projects: ProjectRow[]; stats: DeveloperCrmStats }> {
  await requireAdmin();
  const agencies = await collections.agencies.find(DEVELOPER_FILTER).sort({ name: 1 }).toArray();
  const ids = agencies.map((a) => a._id.toHexString());
  const [users, projects, propertyCounts, managers] = await Promise.all([
    collections.users.find({ agencyId: { $in: ids } }, { projection: { agencyId: 1, email: 1, lastLoginAt: 1 } }).toArray(),
    listProjects({ developerId: { $in: ids } }),
    collections.properties.aggregate<{ _id: string; n: number }>([{ $match: { agencyId: { $in: ids } } }, { $group: { _id: "$agencyId", n: { $sum: 1 } } }]).toArray(),
    managerEmails(),
  ]);
  const userBy = new Map(users.map((u) => [String(u.agencyId), u]));
  const propsBy = new Map(propertyCounts.map((r) => [r._id, r.n]));
  const projectsBy = new Map<string, typeof projects>();
  for (const p of projects) projectsBy.set(p.developerId, [...(projectsBy.get(p.developerId) ?? []), p]);
  const nameBy = new Map(agencies.map((a) => [a._id.toHexString(), a.name]));
  const now = Date.now();

  const rows: DeveloperRow[] = agencies.map((a) => {
    const id = a._id.toHexString();
    const own = projectsBy.get(id) ?? []; // most recently updated first
    const dev = toDeveloper(
      a,
      userBy.get(id),
      { projectCount: own.length, propertyCount: propsBy.get(id) ?? 0, lastProjectUpdateAt: own[0] ? new Date(own[0].lastUpdateAt) : null, managers },
      now
    );
    return {
      ...dev,
      projects: own.map(({ id, name, town, province, status, lastUpdateAt, daysSinceUpdate, freshness }) => ({ id, name, town, province, status, lastUpdateAt, daysSinceUpdate, freshness })),
    };
  });

  const stats: DeveloperCrmStats = {
    developers: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    projects: projects.length,
    underConstruction: projects.filter((p) => p.status === "construction").length,
    completed: projects.filter((p) => p.status === "completed").length,
    recentlyUpdated: projects.filter((p) => p.daysSinceUpdate < STALE_DAYS.warning).length,
    noRecentActivity: rows.filter((r) => r.daysSinceActivity === null || r.daysSinceActivity >= STALE_DAYS.warning).length,
    stale: {
      30: projects.filter((p) => p.daysSinceUpdate >= 30).length,
      60: projects.filter((p) => p.daysSinceUpdate >= 60).length,
      90: projects.filter((p) => p.daysSinceUpdate >= 90).length,
    },
  };

  return { rows, projects: projects.map((p) => ({ ...p, developerName: nameBy.get(p.developerId) ?? "" })), stats };
}

/** The newest history entries across all developers (CRM overview). */
export async function listRecentActivity(limit = 12): Promise<Activity[]> {
  await requireAdmin();
  const docs = await collections.projectActivity.find({ type: { $ne: "login" } }).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(toActivity);
}

/* ---------- One developer ---------- */

export async function findDeveloperDoc(id: unknown) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  return collections.agencies.findOne({ _id: new ObjectId(id), ...DEVELOPER_FILTER });
}

export async function getDeveloper(id: string): Promise<Developer | null> {
  await requireAdmin();
  const a = await findDeveloperDoc(id);
  if (!a) return null;
  const [user, projects, propertyCount, managers] = await Promise.all([
    collections.users.findOne({ agencyId: id }, { projection: { email: 1, lastLoginAt: 1 } }),
    collections.devProjects.find({ developerId: id }, { projection: { lastUpdateAt: 1 } }).sort({ lastUpdateAt: -1 }).toArray(),
    collections.properties.countDocuments({ agencyId: id }),
    managerEmails(),
  ]);
  return toDeveloper(a, user, { projectCount: projects.length, propertyCount, lastProjectUpdateAt: projects[0]?.lastUpdateAt ?? null, managers }, Date.now());
}

/** The developer's history across all projects (logins included), newest first. */
export async function listDeveloperActivity(developerId: string, limit = 300): Promise<Activity[]> {
  await requireAdmin();
  const docs = await collections.projectActivity.find({ developerId }).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(toActivity);
}

export async function listProjectActivity(projectId: string, limit = 500): Promise<Activity[]> {
  await requireAdmin();
  const docs = await collections.projectActivity.find({ projectId }).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map(toActivity);
}

export async function listDeveloperContacts(developerId: string): Promise<DeveloperContact[]> {
  await requireAdmin();
  const docs = await collections.developerContacts.find({ developerId }).sort({ createdAt: 1 }).toArray();
  return docs.map((d) => ({ id: d._id.toHexString(), name: d.name, position: d.position, email: d.email, phone: d.phone, notes: d.notes, createdAt: d.createdAt.toISOString() }));
}

/** projectId given = only that project's notes; otherwise all of the developer's notes. */
export async function listDeveloperNotes(developerId: string, projectId?: string): Promise<DeveloperNote[]> {
  await requireAdmin();
  const docs = await collections.developerNotes.find({ developerId, ...(projectId ? { projectId } : {}) }).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => ({
    id: d._id.toHexString(),
    projectId: d.projectId,
    body: d.body,
    authorEmail: d.author.email,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
}

/** Agency accounts that could be marked as developers (Add developer → existing account). */
export async function listConvertibleAgencies(): Promise<{ id: string; name: string; email: string; town: string }[]> {
  await requireAdmin();
  const docs = await collections.agencies.find({ accountType: { $ne: "developer" } }, { projection: { name: 1, email: 1, town: 1 } }).sort({ name: 1 }).toArray();
  return docs.map((a) => ({ id: a._id.toHexString(), name: a.name, email: a.email ?? "", town: a.town ?? "" }));
}

/* ---------- Creating ---------- */

export type CreateDeveloperResult = { ok: true; id: string; email: EmailResult | "not_sent" } | { ok: false; error: "email_taken" };

/**
 * Creates the developer account and its login (login = email), like Add agency.
 * With sendInvite the temporary password is emailed now; otherwise the login waits (status "Pending")
 * until the admin uses "Send login details". `values` must already be validated.
 */
export async function createDeveloper(values: z.output<typeof newDeveloperSchema>): Promise<CreateDeveloperResult> {
  await requireAdmin();
  const { sendInvite, relationshipManagerId, ...v } = values;
  const email = v.email.toLowerCase();
  await ensureIndexes();
  if (await collections.users.findOne({ email }, { projection: { _id: 1 } })) return { ok: false, error: "email_taken" };

  const now = new Date();
  const _id = new ObjectId();
  const agencyId = _id.toHexString();
  const agency: AgencyDoc = {
    _id,
    agencyId,
    accountType: "developer",
    name: v.name,
    slug: await uniqueSlug(v.name),
    legalName: v.legalName,
    cif: v.cif.replace(/[\s-]/g, "").toUpperCase(),
    country: v.country,
    town: v.town,
    street: v.street,
    postcode: v.postcode,
    province: v.province,
    website: v.website,
    email,
    contactEmail: v.contactEmail,
    phone: v.phone,
    contactPerson: v.contactPerson,
    contactPosition: v.contactPosition,
    regions: v.regions,
    description: v.description,
    relationshipManagerId: relationshipManagerId || null,
    status: "active", // free for developers: no trial
    createdAt: now,
    updatedAt: now,
  };
  await collections.agencies.insertOne(agency);

  const user: UserDoc = { _id: new ObjectId(), role: "developer", agencyId, email, passwordHash: null, createdAt: now, updatedAt: now };
  try {
    await collections.users.insertOne(user);
  } catch (error) {
    await collections.agencies.deleteOne({ _id });
    if (error instanceof MongoServerError && error.code === 11000) return { ok: false, error: "email_taken" };
    throw error;
  }
  const emailResult = sendInvite ? ((await sendLoginDetails(agencyId)) ?? "failed") : "not_sent";
  return { ok: true, id: agencyId, email: emailResult };
}
