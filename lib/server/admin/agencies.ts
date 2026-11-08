// lib/server/admin/agencies.ts
// Helpers for the admin "Agencies" pages. Plain server functions (not actions):
// only server code can call them, the browser can't.
import "server-only";
import { MongoServerError, ObjectId, type Document } from "mongodb";
import type { z } from "zod";
import { collections, ensureIndexes } from "@/lib/db";
import { toFeed } from "@/lib/server/feeds";
import { toProperty } from "@/lib/server/properties";
import { checkKyeroFeed } from "@/lib/server/kyero";
import { importFeed } from "@/lib/server/feed-import";
import { loginDetailsEmail, sendEmail, type EmailResult } from "@/lib/server/email";
import { hashPassword, temporaryPassword } from "@/lib/server/passwords";
import type { addAgencySchema } from "@/lib/schemas/admin";
import type { AdminAgency, AdminFeed, AdminProperty } from "@/types/admin";
import type { FeedDoc } from "@/types/feed";
import type { PropertyStatsSummary } from "@/types/property-events";
import { countEvents } from "@/lib/server/property-events";
import type { AgencyDoc, UserDoc } from "@/types/models";
import { requireAdmin } from "./current-admin";

/** Agency + its login → the plain object the admin pages use. */
export function toAdminAgency(a: AgencyDoc, user?: Pick<UserDoc, "email" | "passwordHash" | "lastLoginAt" | "mustChangePassword"> | null): AdminAgency {
  return {
    id: a._id.toHexString(),
    name: a.name,
    legalName: a.legalName ?? "",
    cif: a.cif ?? "",
    contactPerson: a.contactPerson ?? "",
    email: a.email ?? user?.email ?? a.contactEmail ?? "",
    phone: a.phone ?? "",
    town: a.town ?? "",
    regions: a.regions ?? [],
    status: a.status ?? "active",
    createdAt: a.createdAt.toISOString(),
    lastLoginAt: user?.lastLoginAt?.toISOString() ?? null,
    // Hasn't logged in and chosen a password yet
    invitePending: !!user && (!user.passwordHash || !!user.mustChangePassword),
    registration: {
      preferredLanguage: a.preferredLanguage ?? "",
      raicv: a.raicv ?? "",
      website: a.website ?? "",
      address: [a.street, [a.postcode, a.town].filter(Boolean).join(" "), a.province].filter(Boolean).join(", "),
      ownerName: a.ownerName ?? "",
      ownerIdNumber: a.ownerIdNumber ?? "",
      phone2: a.phone2 ?? "",
      email2: a.email2 ?? "",
      crm: a.crm ?? "",
      crmAgencyNumber: a.crmAgencyNumber ?? "",
      paymentFrequency: a.billing?.paymentFrequency ?? "",
      // Never the full IBAN in the browser
      iban: a.billing?.iban ? `${a.billing.iban.slice(0, 4)} •••• ${a.billing.iban.slice(-4)}` : "",
      privacyAcceptedAt: a.privacyAcceptedAt?.toISOString() ?? null,
    },
  };
}

/** All agencies, newest first. */
export async function listAgencies(): Promise<AdminAgency[]> {
  await requireAdmin();
  const [agencies, users] = await Promise.all([
    collections.agencies.find().sort({ createdAt: -1 }).toArray(),
    collections.users.find({}, { projection: { agencyId: 1, email: 1, passwordHash: 1, lastLoginAt: 1, mustChangePassword: 1 } }).toArray(),
  ]);
  const userByAgency = new Map(users.map((u) => [String(u.agencyId), u]));
  return agencies.map((a) => toAdminAgency(a, userByAgency.get(a._id.toHexString())));
}

/**
 * Per agency: how many feeds, and how many properties are active on the network
 * (active, not hidden by the agency, not hidden by the admin).
 */
export async function countsByAgency(): Promise<{
  feeds: Record<string, number>;
  activeProperties: Record<string, number>;
  /** Views and WhatsApp clicks of all the agency's properties (30 days and all time). */
  stats: PropertyStatsSummary;
}> {
  await requireAdmin();
  const [feeds, properties, stats] = await Promise.all([
    collections.feeds.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$agencyId", n: { $sum: 1 } } }]).toArray(),
    collections.properties
      .aggregate<{ _id: string; n: number }>([
        { $match: { status: "active", hidden: { $ne: true }, moderation: null } },
        { $group: { _id: "$agencyId", n: { $sum: 1 } } },
      ])
      .toArray(),
    countEvents("agency"),
  ]);
  const toRecord = (rows: { _id: string; n: number }[]) => Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
  return { feeds: toRecord(feeds), activeProperties: toRecord(properties), stats };
}

/* ---------- One agency (detail page) ---------- */

/** Views and WhatsApp clicks of all of one agency's properties (30 days and all time). Read-only. */
export async function agencyStats(agencyId: string): Promise<PropertyStatsSummary[string]> {
  await requireAdmin();
  return (await countEvents("agency", agencyId))[agencyId] ?? { views: 0, views30: 0, whatsapp: 0, whatsapp30: 0 };
}

/** One agency with its login info, or null if the id is wrong or it was deleted. */
export async function getAgencyById(id: string): Promise<AdminAgency | null> {
  await requireAdmin();
  if (!ObjectId.isValid(id)) return null;
  const agency = await collections.agencies.findOne({ _id: new ObjectId(id) });
  if (!agency) return null;
  const user = await collections.users.findOne(
    { agencyId: agency._id.toHexString() },
    { projection: { email: 1, passwordHash: 1, lastLoginAt: 1, mustChangePassword: 1 } }
  );
  return toAdminAgency(agency, user);
}

/** The agency's XML feeds, oldest first. */
export async function listAgencyFeeds(agencyId: string): Promise<AdminFeed[]> {
  await requireAdmin();
  const docs = await collections.feeds.find({ agencyId }).sort({ createdAt: 1 }).toArray();
  return docs.map((d) => ({ ...toFeed(d), agencyId }));
}

/** A property document → what the admin pages use: the panel's fields plus owner and moderation. */
export function toAdminProperty(d: Document): AdminProperty {
  const m = d.moderation;
  return {
    ...toProperty(d),
    agencyId: String(d.agencyId),
    moderation: m ? { reason: String(m.reason ?? ""), at: m.at instanceof Date ? m.at.toISOString() : String(m.at) } : null,
  };
}

/** All of the agency's properties (manual and from feeds), newest first. */
export async function listAgencyProperties(agencyId: string): Promise<AdminProperty[]> {
  await requireAdmin();
  const docs = await collections.properties.find({ agencyId }).sort({ createdAt: -1 }).toArray();
  return docs.map(toAdminProperty);
}

/* ---------- Creating an agency (Add agency + approving an application) ---------- */

export type CreateAgencyResult =
  | { ok: true; id: string; feed: "none" | "added" | "failed"; email: EmailResult }
  | { ok: false; error: "email_taken" };

/**
 * Gives the agency's login a new temporary password and emails it (login = the agency's email).
 * The agency must choose its own password at the next login. The password itself is never stored or logged.
 * Returns null if the agency has no login.
 */
export async function sendLoginDetails(agencyId: string): Promise<EmailResult | null> {
  await requireAdmin();
  const [user, agency] = await Promise.all([
    collections.users.findOne({ agencyId }),
    ObjectId.isValid(agencyId) ? collections.agencies.findOne({ _id: new ObjectId(agencyId) }) : null,
  ]);
  if (!user || !agency) return null;

  const password = temporaryPassword();
  await collections.users.updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(password), mustChangePassword: true, invite: null, updatedAt: new Date() } }
  );
  return sendEmail(loginDetailsEmail({ to: user.email, agencyName: agency.name, password }));
}

/** "Costa Homes S.L." → "costa-homes-s-l" */
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "agency";

/** A slug no other agency uses: "costa-homes", then "costa-homes-2", … */
export async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await collections.agencies.findOne({ slug }, { projection: { _id: 1 } }))) return slug;
  }
}

/**
 * Creates the agency and its login (login = email), emails a temporary password,
 * and adds its XML feed if one was given. A broken feed or email doesn't stop the agency being created.
 * `values` must already be validated with addAgencySchema.
 */
/** `extra`: more agency fields, e.g. the register form details of an approved application (from the database). */
export async function createAgency(values: z.output<typeof addAgencySchema>, extra: Partial<AgencyDoc> = {}): Promise<CreateAgencyResult> {
  await requireAdmin();
  const { feedUrl, ...v } = values;
  const email = v.email.toLowerCase();

  await ensureIndexes(); // unique user email + agency slug

  // One login per email
  if (await collections.users.findOne({ email }, { projection: { _id: 1 } })) return { ok: false, error: "email_taken" };

  // 1. The agency
  const now = new Date();
  const _id = new ObjectId();
  // The same agencyId on the agency and on its login (users.agencyId), so both records show the link
  const agencyId = _id.toHexString();
  const agency: AgencyDoc = {
    ...extra,
    _id,
    agencyId,
    name: v.name,
    slug: await uniqueSlug(v.name),
    legalName: v.legalName,
    cif: v.cif.replace(/[\s-]/g, "").toUpperCase(),
    contactPerson: v.contactPerson,
    email,
    phone: v.phone,
    town: v.town,
    regions: v.regions,
    status: v.status,
    createdAt: now,
    updatedAt: now,
  };
  await collections.agencies.insertOne(agency);

  // 2. Its login; the password is set by sendLoginDetails() below
  const user: UserDoc = {
    _id: new ObjectId(),
    // Never admin: admin logins are separate accounts. An approved developer application logs in as a developer.
    role: agency.accountType === "developer" ? "developer" : "agency",
    agencyId,
    email,
    passwordHash: null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await collections.users.insertOne(user);
  } catch (error) {
    await collections.agencies.deleteOne({ _id: agency._id }); // don't leave an agency without a login
    if (error instanceof MongoServerError && error.code === 11000) return { ok: false, error: "email_taken" };
    throw error;
  }
  const emailResult = (await sendLoginDetails(agencyId)) ?? "failed";

  // 3. Its XML feed, if given
  let feed: "none" | "added" | "failed" = "none";
  if (feedUrl) {
    const check = await checkKyeroFeed(feedUrl);
    if (!check.ok) {
      feed = "failed";
    } else {
      const doc: FeedDoc = {
        _id: new ObjectId(),
        agencyId,
        name: `${v.name} feed`,
        url: feedUrl,
        status: "active",
        propertyCount: 0,
        lastSyncAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      };
      await collections.feeds.insertOne(doc);
      const result = await importFeed(doc, check.properties);
      feed = result.ok ? "added" : "failed";
    }
  }

  return { ok: true, id: agencyId, feed, email: emailResult };
}
