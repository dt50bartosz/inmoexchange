// app/[locale]/aviso-legal/page.tsx
// Legal notice (LSSI art. 10): who runs this website. Texts: messages legal.notice; company details: lib/constants/legal.ts.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalPage, { legalMetadata } from "@/components/legal/LegalPage";
import LegalDocumentView, { legalDocForPage, legalDocMetadata } from "@/components/legal/LegalDocumentView";

const SECTIONS = ["owner", "purpose", "ip", "liability", "law"] as const;

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ version?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  // A version published in Admin → Legal documents replaces the built-in text
  const shown = await legalDocForPage("legal_notice", (await searchParams).version);
  if (shown) return legalDocMetadata(locale, shown);
  const t = await getTranslations({ locale, namespace: "legal.notice" });
  return legalMetadata(locale, "/aviso-legal", t("title"), t("description"));
}

export default async function LegalNoticePage({ searchParams }: Props) {
  const shown = await legalDocForPage("legal_notice", (await searchParams).version);
  if (shown) return <LegalDocumentView {...shown} />;
  return <LegalPage namespace="legal.notice" sections={SECTIONS} />;
}
