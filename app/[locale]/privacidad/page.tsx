// app/[locale]/privacidad/page.tsx
// Privacy policy (GDPR / LOPDGDD): what personal data Colabora MLS processes and why. Texts: messages legal.privacy; company details: lib/constants/legal.ts.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalPage, { legalMetadata } from "@/components/legal/LegalPage";
import LegalDocumentView, { legalDocForPage, legalDocMetadata } from "@/components/legal/LegalDocumentView";

const SECTIONS = ["controller", "data", "purposes", "buyers", "recipients", "retention", "rights", "security", "changes"] as const;

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ version?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  // A version published in Admin → Legal documents replaces the built-in text
  const shown = await legalDocForPage("privacy", (await searchParams).version);
  if (shown) return legalDocMetadata(locale, shown);
  const t = await getTranslations({ locale, namespace: "legal.privacy" });
  return legalMetadata(locale, "/privacidad", t("title"), t("description"));
}

export default async function PrivacyPage({ searchParams }: Props) {
  const shown = await legalDocForPage("privacy", (await searchParams).version);
  if (shown) return <LegalDocumentView {...shown} />;
  return <LegalPage namespace="legal.privacy" sections={SECTIONS} />;
}
