// app/[locale]/legal/[slug]/page.tsx
// Legal documents that only exist in Admin → Legal documents (data protection, agency / developer terms, agreements).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import LegalDocumentView, { LegalDocumentPending, legalDocForPage, legalDocMetadata } from "@/components/legal/LegalDocumentView";
import { LEGAL_SLUGS } from "@/lib/constants/legal-docs";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ version?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const key = LEGAL_SLUGS[slug];
  if (!key) return {};
  const shown = await legalDocForPage(key, (await searchParams).version);
  if (shown) return legalDocMetadata(locale, shown);
  const tl = await getTranslations({ locale, namespace: "legal" });
  return { title: tl(`docs.${key}`), robots: { index: false, follow: true } };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const key = LEGAL_SLUGS[slug];
  if (!key) notFound();
  const shown = await legalDocForPage(key, (await searchParams).version);
  return shown ? <LegalDocumentView {...shown} /> : <LegalDocumentPending docKey={key} />;
}
