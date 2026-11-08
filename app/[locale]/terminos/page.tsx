// app/[locale]/terminos/page.tsx
// Terms of use of the Colabora MLS network. Texts: messages legal.terms; company details: lib/constants/legal.ts.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LegalPage, { legalMetadata } from "@/components/legal/LegalPage";

const SECTIONS = ["service", "access", "rules", "content", "price", "leaving", "liability", "data", "changes", "law"] as const;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.terms" });
  return legalMetadata(locale, "/terminos", t("title"), t("description"));
}

export default function TermsPage() {
  return <LegalPage namespace="legal.terms" sections={SECTIONS} />;
}
