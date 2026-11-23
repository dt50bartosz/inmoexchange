import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { History, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Layout";
import { LEGAL_DOCS, PLACEHOLDER_RE, hasPlaceholders, type LegalDocKey } from "@/lib/constants/legal-docs";
import { pickLang, publishedVersion, versionByLabel } from "@/lib/server/legal-docs";
import type { LegalDocVersionDoc } from "@/types/legal";
import { legalMetadata } from "./LegalPage";
import LegalLinks from "./LegalLinks";

export type ShownLegalDoc = { docKey: LegalDocKey; doc: LegalDocVersionDoc; isCurrent: boolean };

/**
 * The version to show on a legal page: ?version=<label> (a published or archived one, e.g. what someone accepted),
 * else the published version. null = nothing in the database (built-in pages then show their built-in text).
 */
export async function legalDocForPage(docKey: LegalDocKey, versionParam?: string | string[]): Promise<ShownLegalDoc | null> {
  const current = await publishedVersion(docKey).catch(() => null);
  if (typeof versionParam === "string" && versionParam && versionParam !== current?.version) {
    const old = await versionByLabel(docKey, versionParam.slice(0, 40)).catch(() => null);
    if (old) return { docKey, doc: old, isCurrent: false };
  }
  return current ? { docKey, doc: current, isCurrent: true } : null;
}

/** Not indexed while it has placeholders, for old versions, and while the company details are examples. */
export function legalDocMetadata(locale: string, shown: ShownLegalDoc): Metadata {
  const { title, content } = pickLang(shown.doc, locale);
  const meta = legalMetadata(locale, LEGAL_DOCS[shown.docKey].path, title, title);
  return !shown.isCurrent || hasPlaceholders(content) ? { ...meta, robots: { index: false, follow: true } } : meta;
}

/** {{…}} → a highlighted "to be completed" mark. The HTML is already cleaned, so the captured text is escaped. */
const markPlaceholders = (html: string, label: string) =>
  html.replace(new RegExp(PLACEHOLDER_RE.source, "g"), (_m, text: string) => `<mark class="legal-placeholder" title="${label}">${text}</mark>`);

/** A published (or archived) version from Admin → Legal documents. `children`: extra content (e.g. the cookie table). */
export default async function LegalDocumentView({ docKey, doc, isCurrent, children }: ShownLegalDoc & { children?: ReactNode }) {
  const locale = await getLocale();
  const tl = await getTranslations("legal");
  const format = await getFormatter();
  const { lang, title, content } = pickLang(doc, locale);
  const placeholders = hasPlaceholders(content);
  const path = LEGAL_DOCS[docKey].path;

  return (
    // Top padding clears the navbar, which sits over the page
    <Container className="max-w-3xl pb-16 pt-14">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {tl("doc.version", { version: doc.version })}
        {doc.publishedAt && <> · {tl("doc.published", { date: format.dateTime(doc.publishedAt, { dateStyle: "long" }) })}</>}
      </p>

      {!isCurrent && (
        <p role="note" className="mt-6 flex gap-3 rounded-lg border bg-muted/50 p-4 text-sm">
          <History aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {tl("doc.oldVersion")}{" "}
            <Link href={path} className="font-medium underline underline-offset-2">
              {tl("doc.viewCurrent")}
            </Link>
          </span>
        </p>
      )}
      {placeholders && (
        <p role="note" className="mt-6 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          {tl("doc.placeholderBanner")}
        </p>
      )}
      {lang !== locale && <p className="mt-4 text-sm text-muted-foreground">{tl("doc.notTranslated")}</p>}
      {lang === locale && locale !== "es" && <p className="mt-4 text-sm text-muted-foreground">{tl("spanishBinding")}</p>}

      <div className="blog-content legal-content mt-8" dangerouslySetInnerHTML={{ __html: markPlaceholders(content, tl("doc.placeholderLabel")) }} />
      {children && <div className="mt-10 space-y-8 leading-relaxed">{children}</div>}
      <LegalLinks />
    </Container>
  );
}

/** For /legal/<slug> before anything is published. */
export async function LegalDocumentPending({ docKey }: { docKey: LegalDocKey }) {
  const tl = await getTranslations("legal");
  return (
    <Container className="max-w-3xl pb-16 pt-14">
      <h1 className="text-3xl font-semibold tracking-tight">{tl(`docs.${docKey}`)}</h1>
      <p role="note" className="mt-6 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
        {tl("doc.pending")}
      </p>
      <LegalLinks />
    </Container>
  );
}
