// lib/server/legal-docs.ts
// Versioned legal documents: drafts edited in Admin → Legal, one published version per document, archived history.
// Published / archived versions are never edited again: they are the exact text people accepted.
import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { z } from "zod";
import { collections, ensureIndexes } from "@/lib/db";
import { cleanHtml } from "@/lib/server/blog";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { COOKIE_POLICY_VERSION } from "@/lib/cookie-consent";
import { LEGAL } from "@/lib/constants/legal";
import { LEGAL_DOC_KEYS, LEGAL_DOCS, LEGAL_LANGS, legalTemplate, type LegalDocKey, type LegalLang } from "@/lib/constants/legal-docs";
import type { CurrentLegalVersion, LegalDocVersion, LegalDocVersionDoc } from "@/types/legal";

type Writer = { userId: string; email: string };

/** The blog's cleaner (no scripts, styles or event attributes), minus images: legal texts have none. */
const cleanLegalHtml = (html: string) => cleanHtml(html).replace(/<img\b[^>]*>/gi, "");

export const isLegalDocKey = (k: unknown): k is LegalDocKey => typeof k === "string" && (LEGAL_DOC_KEYS as readonly string[]).includes(k);

export const toLegalDocVersion = (d: LegalDocVersionDoc): LegalDocVersion => ({
  id: d._id.toHexString(),
  key: d.key,
  version: d.version,
  status: d.status,
  title: d.title,
  content: d.content,
  changeNote: d.changeNote,
  material: d.material,
  publishedAt: d.publishedAt?.toISOString() ?? null,
  createdBy: d.createdBy,
  updatedBy: d.updatedBy,
  createdAt: d.createdAt.toISOString(),
  updatedAt: d.updatedAt.toISOString(),
});

/* ---------- Reading ---------- */

export async function publishedVersion(key: LegalDocKey): Promise<LegalDocVersionDoc | null> {
  return collections.legalDocuments.findOne({ key, status: "published" });
}

/** A specific published or archived version (what someone accepted), by its version label. Never drafts. */
export async function versionByLabel(key: LegalDocKey, version: string): Promise<LegalDocVersionDoc | null> {
  return collections.legalDocuments.findOne({ key, version, status: { $in: ["published", "archived"] } });
}

/** Built-in pages' versions until something is published in the admin. */
const BUILT_IN_VERSION: Partial<Record<LegalDocKey, string>> = {
  terms: LEGAL.updated,
  privacy: LEGAL.updated,
  legal_notice: LEGAL.updated,
  cookies: COOKIE_POLICY_VERSION,
};

/** The version in force for every document (saved with consents and acceptances). */
export async function currentLegalVersions(): Promise<Record<LegalDocKey, CurrentLegalVersion>> {
  const published = await collections.legalDocuments.find({ status: "published" }, { projection: { key: 1, version: 1, publishedAt: 1 } }).toArray();
  const byKey = new Map(published.map((d) => [d.key, d]));
  return Object.fromEntries(
    LEGAL_DOC_KEYS.map((key) => {
      const d = byKey.get(key);
      if (d) return [key, { key, version: d.version, publishedAt: d.publishedAt?.toISOString() ?? null, source: "database" }];
      const builtIn = BUILT_IN_VERSION[key];
      return [key, { key, version: builtIn ?? "", publishedAt: null, source: builtIn ? "built_in" : "none" }];
    })
  ) as Record<LegalDocKey, CurrentLegalVersion>;
}

export async function currentLegalVersion(key: LegalDocKey): Promise<string> {
  const d = await publishedVersion(key);
  return d?.version ?? BUILT_IN_VERSION[key] ?? "";
}

/** The text in the reader's language, else Spanish (the binding version), else English. */
export function pickLang(d: Pick<LegalDocVersionDoc, "title" | "content">, lang: string): { lang: LegalLang; title: string; content: string } {
  const order = [lang, "es", "en", "pl"].filter((l): l is LegalLang => (LEGAL_LANGS as readonly string[]).includes(l));
  const found = order.find((l) => d.content[l]?.trim()) ?? "es";
  return { lang: found, title: d.title[found] || d.title.es || d.title.en, content: cleanLegalHtml(d.content[found] ?? "") };
}

/** Admin → Legal overview: per document, the published version and whether a draft exists. */
export async function legalOverview() {
  const docs = await collections.legalDocuments
    .find({ status: { $in: ["published", "draft"] } }, { projection: { key: 1, status: 1, version: 1, publishedAt: 1, updatedAt: 1 } })
    .toArray();
  return LEGAL_DOC_KEYS.map((key) => {
    const pub = docs.find((d) => d.key === key && d.status === "published");
    const draft = docs.find((d) => d.key === key && d.status === "draft");
    return {
      key,
      published: pub ? { version: pub.version, publishedAt: pub.publishedAt?.toISOString() ?? null } : null,
      draft: draft ? { version: draft.version, updatedAt: draft.updatedAt.toISOString() } : null,
    };
  });
}

export async function listVersions(key: LegalDocKey): Promise<LegalDocVersion[]> {
  const docs = await collections.legalDocuments.find({ key }).sort({ createdAt: -1 }).toArray();
  return docs.map(toLegalDocVersion);
}

/* ---------- Writing (admin actions check the admin first) ---------- */

const langRecord = (schema: z.ZodString) => z.object({ es: schema, en: schema, pl: schema });

export const legalDraftSchema = z.object({
  version: z.string().trim().min(1, "required").max(40, "tooLong").regex(/^[\w.\- ]+$/, "invalid"),
  title: langRecord(z.string().trim().max(200, "tooLong")).refine((t) => !!t.es, { path: ["es"], message: "required" }),
  content: langRecord(z.string().max(300_000, "tooLong")),
  changeNote: z.string().trim().max(1000, "tooLong"),
  material: z.boolean(),
});

/**
 * Starts a new draft: from the published version if there is one, else from the template.
 * Only one draft per document (the unique index enforces it too).
 */
export async function startDraft(key: LegalDocKey, writer: Writer): Promise<ActionResult<LegalDocVersion, "draft_exists">> {
  await ensureIndexes();
  if (await collections.legalDocuments.findOne({ key, status: "draft" }, { projection: { _id: 1 } })) return fail("draft_exists");
  const base = await publishedVersion(key);
  const tpl = base ? { title: base.title, content: base.content } : legalTemplate(key);
  const now = new Date();
  const doc: LegalDocVersionDoc = {
    _id: new ObjectId(),
    key,
    version: suggestVersion(base?.version),
    status: "draft",
    title: tpl.title,
    content: tpl.content,
    changeNote: "",
    material: false,
    publishedAt: null,
    createdBy: writer,
    updatedBy: writer,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await collections.legalDocuments.insertOne(doc);
  } catch (e) {
    if (e instanceof MongoServerError && e.code === 11000) return fail("draft_exists");
    throw e;
  }
  return ok(toLegalDocVersion(doc));
}

/** "1.0" → "1.1"; anything else → today's date. */
function suggestVersion(previous?: string) {
  if (!previous) return "1.0";
  const m = /^(\d+)\.(\d+)$/.exec(previous);
  return m ? `${m[1]}.${Number(m[2]) + 1}` : new Date().toISOString().slice(0, 10);
}

export async function saveDraft(
  id: string,
  input: unknown,
  writer: Writer
): Promise<ActionResult<LegalDocVersion, "validation_error" | "not_found" | "version_taken">> {
  if (!ObjectId.isValid(id)) return fail("not_found");
  const parsed = legalDraftSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const draft = await collections.legalDocuments.findOne({ _id: new ObjectId(id), status: "draft" });
  if (!draft) return fail("not_found");
  const { version, title, content, changeNote, material } = parsed.data;
  if (await collections.legalDocuments.findOne({ key: draft.key, version, _id: { $ne: draft._id } }, { projection: { _id: 1 } }))
    return fail("version_taken", { version: "taken" });
  const clean = Object.fromEntries(LEGAL_LANGS.map((l) => [l, content[l].trim() ? cleanLegalHtml(content[l]) : ""])) as Record<LegalLang, string>;
  const saved = await collections.legalDocuments.findOneAndUpdate(
    { _id: draft._id, status: "draft" },
    { $set: { version, title, content: clean, changeNote, material, updatedBy: writer, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return saved ? ok(toLegalDocVersion(saved)) : fail("not_found");
}

/** The draft becomes the published version; the previous published one is archived (kept forever). */
export async function publishDraft(id: string, writer: Writer): Promise<ActionResult<LegalDocVersion, "not_found" | "empty">> {
  if (!ObjectId.isValid(id)) return fail("not_found");
  const draft = await collections.legalDocuments.findOne({ _id: new ObjectId(id), status: "draft" });
  if (!draft) return fail("not_found");
  if (!draft.content.es.trim() && !draft.content.en.trim()) return fail("empty");
  const now = new Date();
  await collections.legalDocuments.updateMany({ key: draft.key, status: "published" }, { $set: { status: "archived", updatedAt: now } });
  const saved = await collections.legalDocuments.findOneAndUpdate(
    { _id: draft._id, status: "draft" },
    { $set: { status: "published", publishedAt: now, updatedBy: writer, updatedAt: now } },
    { returnDocument: "after" }
  );
  return saved ? ok(toLegalDocVersion(saved)) : fail("not_found");
}

export async function deleteDraft(id: string): Promise<ActionResult<{ key: LegalDocKey }, "not_found">> {
  if (!ObjectId.isValid(id)) return fail("not_found");
  const draft = await collections.legalDocuments.findOneAndDelete({ _id: new ObjectId(id), status: "draft" });
  return draft ? ok({ key: draft.key }) : fail("not_found");
}

export const legalPathOf = (key: LegalDocKey) => LEGAL_DOCS[key].path;
