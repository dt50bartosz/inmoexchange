// app/[locale]/change-password/page.tsx
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ObjectId } from "mongodb";
import { auth, roleOf } from "@/lib/auth";
import { collections } from "@/lib/db";
import { pendingDocsFor } from "@/lib/server/legal-acceptances";
import { redirect } from "@/i18n/navigation";
import { Container } from "@/components/ui/Layout";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.changePassword");
  return { title: t("metaTitle"), robots: { index: false } };
}

/** First login with the emailed temporary password. Anyone else is sent on (proxy.ts does the same). */
export default async function ChangePasswordPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session?.user?.id) redirect({ href: "/login", locale });
  if (!session!.user.mustChangePassword) redirect({ href: "/panel", locale });

  // Agency / developer logins accept the legal documents in force they haven't accepted yet (admins: none)
  const user = await collections.users.findOne({ _id: new ObjectId(session!.user.id) }, { projection: { role: 1, agencyId: 1 } });
  const role = user ? roleOf(user) : "admin";
  const audience = role === "admin" ? null : role;
  const legalDocs = audience ? await pendingDocsFor(audience, { userId: session!.user.id, orgId: user?.agencyId ?? null }) : [];

  const t = await getTranslations("auth.changePassword");
  return (
    <Container className="flex justify-center py-16">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{t("description")}</p>
        <ChangePasswordForm audience={audience} legalDocs={legalDocs} />
      </div>
    </Container>
  );
}
