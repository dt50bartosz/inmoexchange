// app/[locale]/promotor/promociones/new/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import DevelopmentEditor from "@/components/developer/DevelopmentEditor";
import { requireRole } from "@/lib/server/auth/require-role";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("promotor.developments");
  return { title: t("new") };
}

export default async function NewDevelopmentPage() {
  await requireRole("developer");
  return <DevelopmentEditor project={null} />;
}
