// app/[locale]/terminos/page.tsx
// Terms of use of the Colabora MLS network. Texts: messages legal.terms; company details: lib/constants/legal.ts.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalPage, { legalMetadata } from "@/components/legal/LegalPage";
import LegalDocumentView, { legalDocForPage, legalDocMetadata } from "@/components/legal/LegalDocumentView";

const SECTIONS = ["service", "access", "rules", "content", "leaving", "liability", "data", "changes", "law"] as const;

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ version?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  // A version published in Admin → Legal documents replaces the built-in text
  const shown = await legalDocForPage("terms", (await searchParams).version);
  if (shown) return legalDocMetadata(locale, shown);
  const t = await getTranslations({ locale, namespace: "legal.terms" });
  return legalMetadata(locale, "/terminos", t("title"), t("description"));
}

export default async function TermsPage({ searchParams }: Props) {
  const shown = await legalDocForPage("terms", (await searchParams).version);
  if (shown) return <LegalDocumentView {...shown} />;
  return <LegalPage namespace="legal.terms" sections={SECTIONS} />;
}
