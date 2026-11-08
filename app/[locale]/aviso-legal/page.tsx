// app/[locale]/aviso-legal/page.tsx
// Legal notice (LSSI art. 10): who runs this website. Texts: messages legal.notice; company details: lib/constants/legal.ts.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalPage, { legalMetadata } from "@/components/legal/LegalPage";

const SECTIONS = ["owner", "purpose", "ip", "liability", "law"] as const;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.notice" });
  return legalMetadata(locale, "/aviso-legal", t("title"), t("description"));
}

export default function LegalNoticePage() {
  return <LegalPage namespace="legal.notice" sections={SECTIONS} />;
}
