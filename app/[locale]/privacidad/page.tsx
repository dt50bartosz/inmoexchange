// app/[locale]/privacidad/page.tsx
// Privacy policy (GDPR / LOPDGDD): what personal data Colabora MLS processes and why. Texts: messages legal.privacy; company details: lib/constants/legal.ts.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalPage, { legalMetadata } from "@/components/legal/LegalPage";

const SECTIONS = ["controller", "data", "purposes", "buyers", "recipients", "retention", "rights", "security", "changes"] as const;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.privacy" });
  return legalMetadata(locale, "/privacidad", t("title"), t("description"));
}

export default function PrivacyPage() {
  return <LegalPage namespace="legal.privacy" sections={SECTIONS} />;
}
