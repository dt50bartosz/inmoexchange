// app/[locale]/login/page.tsx
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { Container } from "@/components/ui/Layout";
import LoginForm from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("metaTitle"), robots: { index: false } };
}

type Props = { searchParams: Promise<{ callbackUrl?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { callbackUrl, error } = await searchParams;
  const session = await auth();
  // Already logged in (and not sent here because the session ended): go straight to the panel
  if (session?.user?.id && error !== "suspended" && error !== "signed_out") redirect({ href: "/panel", locale: await getLocale() });

  const t = await getTranslations("auth.login");
  return (
    <Container className="flex justify-center py-16">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{t("description")}</p>
        <LoginForm callbackUrl={callbackUrl} initialError={error} />
      </div>
    </Container>
  );
}
