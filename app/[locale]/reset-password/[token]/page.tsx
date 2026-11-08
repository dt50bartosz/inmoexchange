// app/[locale]/reset-password/[token]/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resetTokenIsValid } from "@/lib/server/account";
import AuthCard from "@/components/auth/AuthCard";
import ResetPasswordForm, { InvalidResetLink } from "@/components/auth/ResetPasswordForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.reset");
  // The link is a secret: don't send it to other sites in the Referer header
  return { title: t("metaTitle"), robots: { index: false }, referrer: "no-referrer" };
}

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("auth.reset");
  const valid = await resetTokenIsValid(token);
  return (
    <AuthCard title={valid ? t("title") : t("invalidTitle")} description={valid ? t("description") : undefined}>
      {valid ? <ResetPasswordForm token={token} /> : <InvalidResetLink />}
    </AuthCard>
  );
}
