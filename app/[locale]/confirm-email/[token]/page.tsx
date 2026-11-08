// app/[locale]/confirm-email/[token]/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuthCard from "@/components/auth/AuthCard";
import ConfirmEmailButton from "@/components/auth/ConfirmEmailButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.confirmEmail");
  return { title: t("metaTitle"), robots: { index: false }, referrer: "no-referrer" };
}

/** Opening the link only shows a button; the change happens when it's clicked (see ConfirmEmailButton). */
export default async function ConfirmEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("auth.confirmEmail");
  return (
    <AuthCard title={t("title")} description={t("description")}>
      <ConfirmEmailButton token={token} />
    </AuthCard>
  );
}
