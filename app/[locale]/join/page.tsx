// app/[locale]/join/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import JoinForm from "@/components/landing/JoinForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("join");
  return { title: t("title"), description: t("metaDescription") };
}

/** Agency sign-up (also at /registro). Developer accounts aren't open to the public: admin creates them. */
export default function JoinPage() {
  return <JoinForm />;
}
