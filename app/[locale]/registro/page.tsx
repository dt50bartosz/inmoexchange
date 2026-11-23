// app/[locale]/registro/page.tsx
// Sign-up from the Colabora MLS landing page: the same registration form as /join, for agencies.
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import JoinForm from "@/components/landing/JoinForm";
import { requiredDocsFor } from "@/lib/server/legal-acceptances";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return { title: t("hero.primaryCta"), robots: { index: false } };
}

export default async function RegistroPage() {
  await connection(); // the legal versions in force are read at request time, never at build
  // The legal documents in force for agencies (their versions are saved with the application)
  return <JoinForm legalDocs={await requiredDocsFor("agency")} />;
}
