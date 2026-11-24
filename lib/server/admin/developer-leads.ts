// lib/server/admin/developer-leads.ts
// Admin → Developer calls: the developers (promotoras) to cold-call, their numbers and every call made.
// Admin only: the actions call requireAdmin() before using these helpers. Personal data: nothing here is logged.
import "server-only";
import { ObjectId } from "mongodb";
import { collections, ensureIndexes } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { CLOSED_LEAD_STATUSES, type DeveloperLeadValues, type LeadStatus } from "@/lib/schemas/developer-leads";
import type { DeveloperLead, DeveloperLeadDoc, LeadDuplicate, LeadPhone } from "@/types/developer-leads";

/* ---------- Dates (Spain time) ---------- */

const TZ = "Europe/Madrid";

/** "2026-11-25": the day in Spain. */
export const madridDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Spain's offset from UTC (minutes) at that moment: 60 in winter, 120 in summer. */
function madridOffsetMinutes(at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/** "2026-11-25" or "2026-11-25T10:30" in Spain time → Date (a day alone = 09:00 that day). "" → null. */
export function fromMadridInput(v: string): Date | null {
  if (!v) return null;
  const [day, time = "09:00"] = v.split("T");
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, h, min));
  return new Date(guess.getTime() - madridOffsetMinutes(guess) * 60000);
}

/** Date → "2026-11-25T10:30" in Spain time, for <input type="datetime-local">. null → "". */
export function toMadridInput(d: Date | null | undefined): string {
  if (!d) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/* ---------- Matching (only for comparing: what is stored is never changed) ---------- */

/** Digits only, without the Spanish prefix: "+34 600 11 22 33" and "600112233" are the same number. */
export function phoneKey(n: string) {
  const digits = n.replace(/\D/g, "");
  return digits.replace(/^(0034|34)(?=\d{9}$)/, "");
}

/** "Promociones Ñandú, S.L." and "promociones nandu sl" are the same company. */
export const companyKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/* ---------- Shapes ---------- */

const PHONE_ORDER: Record<LeadPhone["type"], number> = { mobile: 0, office: 1, other: 2, whatsapp: 3 };

/** The number to call first: mobile, then office, then other; WhatsApp-only last (message first, don't cold-call). */
export const mainPhoneOf = (phones: LeadPhone[]): LeadPhone | null =>
  [...phones].sort((a, b) => PHONE_ORDER[a.type] - PHONE_ORDER[b.type])[0] ?? null;

export function toDeveloperLead(d: DeveloperLeadDoc): DeveloperLead {
  const calls = [...(d.callLog ?? [])].sort((a, b) => b.date.getTime() - a.date.getTime());
  return {
    id: d._id.toHexString(),
    company: d.company,
    contactPerson: d.contactPerson ?? "",
    role: d.role ?? "",
    phones: d.phones ?? [],
    email: d.email ?? "",
    website: d.website ?? "",
    area: d.area ?? "",
    status: d.status,
    source: d.source,
    notes: d.notes ?? "",
    callLog: calls.map((c) => ({ ...c, date: c.date.toISOString() })),
    nextCallAt: d.nextCallAt?.toISOString() ?? null,
    lastCallAt: calls[0]?.date.toISOString() ?? null,
    mainPhone: mainPhoneOf(d.phones ?? []),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/* ---------- Call order ---------- */

/**
 * Who to call first:
 * 0. callback / next call due today or earlier (earliest first)
 * 1. never called (newest added first)
 * 2. everyone else, oldest last call first
 * 3. next call set for a later day (soonest first)
 * 4. closed: not interested / do not call / joined
 */
export function callGroup(l: DeveloperLead, today: string): number {
  if (CLOSED_LEAD_STATUSES.includes(l.status) || l.status === "joined") return 4;
  if (l.nextCallAt) return madridDay(new Date(l.nextCallAt)) <= today ? 0 : 3;
  if (!l.lastCallAt) return 1;
  return 2;
}

export function sortForCalling(leads: DeveloperLead[], now = new Date()): DeveloperLead[] {
  const today = madridDay(now);
  const t = (iso: string | null) => (iso ? Date.parse(iso) : 0);
  return [...leads].sort((a, b) => {
    const ga = callGroup(a, today);
    const gb = callGroup(b, today);
    if (ga !== gb) return ga - gb;
    if (ga === 0 || ga === 3) return t(a.nextCallAt) - t(b.nextCallAt);
    if (ga === 1) return t(b.createdAt) - t(a.createdAt);
    if (ga === 2) return t(a.lastCallAt) - t(b.lastCallAt);
    return a.company.localeCompare(b.company);
  });
}

/* ---------- Reading ---------- */

/** Every lead, in call order (the list filters in the browser, like Admin → Agencies). */
export async function listDeveloperLeads(): Promise<DeveloperLead[]> {
  const docs = await collections.developerLeads.find().toArray();
  return sortForCalling(docs.map(toDeveloperLead));
}

export async function findDeveloperLeadDoc(id: unknown) {
  if (typeof id !== "string" || !ObjectId.isValid(id)) return null;
  return collections.developerLeads.findOne({ _id: new ObjectId(id) });
}

/**
 * Existing leads with one of these numbers or the same company name. `pool`: for the CSV import, leads already
 * checked (so two rows of the same file are caught too).
 */
export async function findDuplicates(
  v: Pick<DeveloperLeadValues, "company" | "phones">,
  excludeId?: string,
  pool?: { id: string; company: string; phones: { number: string }[] }[]
): Promise<LeadDuplicate[]> {
  const existing =
    pool ??
    (await collections.developerLeads.find({}, { projection: { company: 1, phones: 1 } }).toArray()).map((d) => ({
      id: d._id.toHexString(),
      company: d.company,
      phones: d.phones ?? [],
    }));
  const keys = new Set(v.phones.map((p) => phoneKey(p.number)).filter((k) => k.length >= 6));
  const ck = companyKey(v.company);
  const out: LeadDuplicate[] = [];
  for (const e of existing) {
    if (e.id === excludeId) continue;
    const phone = e.phones.find((p) => keys.has(phoneKey(p.number)));
    if (phone) out.push({ id: e.id, company: e.company, reason: "phone", match: phone.number });
    else if (ck && companyKey(e.company) === ck) out.push({ id: e.id, company: e.company, reason: "company", match: e.company });
  }
  return out;
}

/* ---------- Writing ---------- */

/** Field errors for the form: "duplicate.<lead id>" → "Company · phone 600 11 22 33" (the form links to that lead). */
const duplicateErrors = (dupes: LeadDuplicate[]) =>
  Object.fromEntries(dupes.map((d) => [`duplicate.${d.id}`, `${d.company} · ${d.reason === "phone" ? `phone ${d.match}` : "same company name"}`]));

const clean = (v: DeveloperLeadValues) => ({
  company: v.company,
  contactPerson: v.contactPerson,
  role: v.role,
  phones: v.phones.map((p) => ({ type: p.type, number: p.number, ...(p.label ? { label: p.label } : {}) })),
  email: v.email.toLowerCase(),
  website: v.website,
  area: v.area,
  status: v.status,
  source: v.source,
  notes: v.notes,
  nextCallAt: fromMadridInput(v.nextCallAt),
});

/** Adds a developer, unless it looks like one already in the list (same number or company name). */
export async function createDeveloperLead(v: DeveloperLeadValues): Promise<ActionResult<{ id: string }, "duplicate">> {
  await ensureIndexes();
  const dupes = await findDuplicates(v);
  if (dupes.length) return fail("duplicate", duplicateErrors(dupes));
  const now = new Date();
  const doc: DeveloperLeadDoc = { _id: new ObjectId(), ...clean(v), callLog: [], createdAt: now, updatedAt: now };
  await collections.developerLeads.insertOne(doc);
  return ok({ id: doc._id.toHexString() });
}

export async function updateDeveloperLead(id: string, v: DeveloperLeadValues): Promise<ActionResult<DeveloperLead, "not_found" | "duplicate">> {
  const lead = await findDeveloperLeadDoc(id);
  if (!lead) return fail("not_found");
  const dupes = await findDuplicates(v, id);
  if (dupes.length) return fail("duplicate", duplicateErrors(dupes));
  const saved = await collections.developerLeads.findOneAndUpdate(
    { _id: lead._id },
    { $set: { ...clean(v), updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return saved ? ok(toDeveloperLead(saved)) : fail("not_found");
}

/**
 * Logs a call: adds it to the history, the outcome becomes the status, and the next call is set to the callback
 * date (or cleared). The number used must be one of the lead's own numbers (or empty).
 */
export async function logDeveloperLeadCall(
  id: string,
  call: { numberUsed: string; outcome: LeadStatus; note: string; nextCallAt: string },
  now = new Date()
): Promise<ActionResult<DeveloperLead, "not_found" | "unknown_number">> {
  const lead = await findDeveloperLeadDoc(id);
  if (!lead) return fail("not_found");
  if (call.numberUsed && !(lead.phones ?? []).some((p) => p.number === call.numberUsed)) return fail("unknown_number", { numberUsed: "invalid" });
  const entry = {
    date: now,
    outcome: call.outcome,
    ...(call.note ? { note: call.note } : {}),
    ...(call.numberUsed ? { numberUsed: call.numberUsed } : {}),
  };
  const saved = await collections.developerLeads.findOneAndUpdate(
    { _id: lead._id },
    { $push: { callLog: entry }, $set: { status: call.outcome, nextCallAt: fromMadridInput(call.nextCallAt), updatedAt: now } },
    { returnDocument: "after" }
  );
  return saved ? ok(toDeveloperLead(saved)) : fail("not_found");
}

/** GDPR deletion request: removes the lead and its whole call history permanently. */
export async function deleteDeveloperLead(id: string): Promise<ActionResult<{ company: string }, "not_found">> {
  if (!ObjectId.isValid(id)) return fail("not_found");
  const removed = await collections.developerLeads.findOneAndDelete({ _id: new ObjectId(id) });
  return removed ? ok({ company: removed.company }) : fail("not_found");
}

/**
 * CSV import: rows already validated (leadCsvRowSchema). Rows that match an existing lead, or an earlier row of the
 * same file, are skipped and reported; the rest are added as new leads with the given source.
 */
export async function importDeveloperLeads(rows: { row: number; values: DeveloperLeadValues }[]) {
  await ensureIndexes();
  const pool = (await collections.developerLeads.find({}, { projection: { company: 1, phones: 1 } }).toArray()).map((d) => ({
    id: d._id.toHexString(),
    company: d.company,
    phones: d.phones ?? [],
  }));
  const now = new Date();
  const toInsert: DeveloperLeadDoc[] = [];
  const skipped: { row: number; company: string; duplicateOf: LeadDuplicate }[] = [];
  for (const { row, values } of rows) {
    const [dupe] = await findDuplicates(values, undefined, pool);
    if (dupe) {
      skipped.push({ row, company: values.company, duplicateOf: dupe });
      continue;
    }
    const doc: DeveloperLeadDoc = { _id: new ObjectId(), ...clean(values), callLog: [], createdAt: now, updatedAt: now };
    toInsert.push(doc);
    pool.push({ id: doc._id.toHexString(), company: doc.company, phones: doc.phones });
  }
  if (toInsert.length) await collections.developerLeads.insertMany(toInsert);
  return { imported: toInsert.length, skipped };
}
