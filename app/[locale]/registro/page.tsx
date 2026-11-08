// app/[locale]/registro/page.tsx
// Sign-up from the Colabora MLS landing page: the same registration form as /join, for agencies.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import JoinForm from "@/components/landing/JoinForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return { title: t("hero.primaryCta"), robots: { index: false } };
}

export default function RegistroPage() {
  return <JoinForm />;
}
