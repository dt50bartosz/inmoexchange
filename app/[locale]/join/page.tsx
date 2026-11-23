// app/[locale]/join/page.tsx
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import JoinForm from "@/components/landing/JoinForm";
import { requiredDocsFor } from "@/lib/server/legal-acceptances";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join");
  return { title: t("title"), description: t("metaDescription") };
}

/** Agency sign-up (also at /registro). Developer accounts aren't open to the public: admin creates them. */
export default async function JoinPage() {
  await connection(); // the legal versions in force are read at request time, never at build
  // The legal documents in force for agencies (their versions are saved with the application)
  return <JoinForm legalDocs={await requiredDocsFor("agency")} />;
}
