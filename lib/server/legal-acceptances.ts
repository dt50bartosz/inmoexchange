// lib/server/legal-acceptances.ts
// What each person accepted, which version and when: registration (agency / developer applications) and first login.
// Append-only log (collection "legal_acceptances"): a new acceptance or a marketing change adds a record, nothing is edited
// except linking an application's records to the account it became.
import "server-only";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { collections, ensureIndexes } from "@/lib/db";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { LEGAL_DOCS, type LegalDocKey } from "@/lib/constants/legal-docs";
import { currentLegalVersions } from "@/lib/server/legal-docs";
import type { LegalAcceptanceDoc, LegalAcceptanceMethod, RegistrationAudience, RequiredLegalDoc } from "@/types/legal";

/** Documents each kind of account must accept to register (in this order). Only those in force are asked for. */
export const REGISTRATION_DOCS: Record<RegistrationAudience, LegalDocKey[]> = {
  agency: ["terms", "privacy", "agency_terms", "mls_agreement", "data_sharing"],
  developer: ["terms", "privacy", "developer_terms", "mls_agreement", "listing_accuracy"],
};

/**
 * The documents to accept now, with the version in force. A document that has never been published
 * (no built-in text, nothing in Admin → Legal documents) is left out until it is published.
 */
export async function requiredDocsFor(audience: RegistrationAudience): Promise<RequiredLegalDoc[]> {
  const current = await currentLegalVersions();
  return REGISTRATION_DOCS[audience]
    .filter((key) => current[key].source !== "none" && current[key].version)
    .map((key) => ({ key, version: current[key].version, path: LEGAL_DOCS[key].path }));
}

/** What the form sends: the versions it showed for each ticked document, plus the two extra boxes. */
export const legalConsentInputSchema = z.object({
  accepted: z.record(z.string().max(40), z.string().max(40)),
  marketing: z.boolean(),
  authorised: z.boolean(),
});
export type LegalConsentInput = z.infer<typeof legalConsentInputSchema>;

export type CheckedConsent = { audience: RegistrationAudience; docs: RequiredLegalDoc[]; marketing: boolean; authorised: boolean };

/**
 * Every required document ticked, at the version in force (a document published while the form was open
 * must be read again: "legal_outdated"), and the "authorised to register" box ticked.
 * Field errors use the keys "legal.<docKey>" and "legal.authorised".
 */
export async function checkConsent(
  audience: RegistrationAudience,
  input: unknown,
  /** First login: only the documents still pending (`docs`), and no "authorised" box for admin-created accounts. */
  opts: { docs?: RequiredLegalDoc[]; needsAuthorised?: boolean } = {}
): Promise<ActionResult<CheckedConsent, "legal_required" | "legal_outdated">> {
  const parsed = legalConsentInputSchema.safeParse(input);
  const needsAuthorised = opts.needsAuthorised ?? true;
  const required = opts.docs ?? (await requiredDocsFor(audience));
  if (!parsed.success) return fail("legal_required", Object.fromEntries(required.map((d) => [`legal.${d.key}`, "acceptRequired"])));
  const { accepted, marketing, authorised } = parsed.data;

  const missing: Record<string, string> = {};
  let outdated = false;
  for (const d of required) {
    const shown = accepted[d.key];
    if (!shown) missing[`legal.${d.key}`] = "acceptRequired";
    else if (shown !== d.version) outdated = true;
  }
  if (needsAuthorised && !authorised) missing["legal.authorised"] = "acceptRequired";
  if (outdated) return fail("legal_outdated");
  if (Object.keys(missing).length) return fail("legal_required", missing);
  return ok({ audience, docs: required, marketing, authorised });
}

type Subject = { applicationId?: string | null; orgId?: string | null; userId?: string | null; email: string };

/** Saves one record per document, one for the authorisation and one for the marketing choice (given or not). */
export async function recordAcceptances(consent: CheckedConsent, subject: Subject, method: LegalAcceptanceMethod, locale: string) {
  await ensureIndexes();
  const now = new Date();
  const base = {
    applicationId: subject.applicationId ?? null,
    orgId: subject.orgId ?? null,
    userId: subject.userId ?? null,
    email: subject.email.toLowerCase(),
    audience: consent.audience,
    method,
    locale,
    createdAt: now,
  };
  const docs: LegalAcceptanceDoc[] = [
    ...consent.docs.map((d) => ({ _id: new ObjectId(), ...base, kind: "document" as const, key: d.key, version: d.version, granted: true })),
    // Only when the box was shown and ticked (admin-created accounts never see it)
    ...(consent.authorised ? [{ _id: new ObjectId(), ...base, kind: "authorised_signatory" as const, key: null, version: null, granted: true }] : []),
    { _id: new ObjectId(), ...base, kind: "marketing" as const, key: null, version: null, granted: consent.marketing },
  ];
  await collections.legalAcceptances.insertMany(docs);
}

/**
 * Approving an application: its acceptances now belong to the new account and its login, and the marketing choice
 * becomes the login's current preference.
 */
export async function linkApplicationAcceptances(applicationId: string, orgId: string) {
  const login = await collections.users.findOne({ agencyId: orgId, role: { $ne: "admin" } }, { projection: { _id: 1 } });
  const userId = login?._id.toHexString() ?? null;
  await collections.legalAcceptances.updateMany({ applicationId }, { $set: { orgId, userId } });
  const marketing = await collections.legalAcceptances.findOne({ applicationId, kind: "marketing" }, { sort: { createdAt: -1 } });
  if (login && marketing) {
    await collections.users.updateOne({ _id: login._id }, { $set: { marketingConsent: { granted: marketing.granted, at: marketing.createdAt } } });
  }
}

/**
 * The required documents this login (or its organisation, from its registration) still has to accept:
 * - never accepted any version → pending
 * - accepted an older version → pending only if a version published after it is marked "material change"
 *   (Admin → Legal documents); minor edits don't ask everyone again.
 */
export async function pendingDocsFor(audience: RegistrationAudience, who: { userId: string; orgId: string | null }): Promise<RequiredLegalDoc[]> {
  const required = await requiredDocsFor(audience);
  if (!required.length) return [];
  const or: object[] = [{ userId: who.userId }];
  if (who.orgId) or.push({ orgId: who.orgId });
  const keys = required.map((d) => d.key);
  const [done, history] = await Promise.all([
    collections.legalAcceptances.find({ kind: "document", granted: true, key: { $in: keys }, $or: or }, { projection: { key: 1, version: 1 } }).toArray(),
    collections.legalDocuments
      .find({ key: { $in: keys }, status: { $in: ["published", "archived"] } }, { projection: { key: 1, version: 1, material: 1, publishedAt: 1 } })
      .sort({ publishedAt: 1 })
      .toArray(),
  ]);

  return required.filter((d) => {
    const accepted = new Set(done.filter((a) => a.key === d.key).map((a) => a.version));
    if (accepted.size === 0) return true;
    if (accepted.has(d.version)) return false;
    // Versions of this document in publication order; those after the newest one accepted decide
    const versions = history.filter((h) => h.key === d.key);
    const lastAccepted = versions.reduce((idx, v, i) => (accepted.has(v.version) ? i : idx), -1);
    return versions.slice(lastAccepted + 1).some((v) => v.material);
  });
}
