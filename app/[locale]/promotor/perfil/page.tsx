// app/[locale]/promotor/perfil/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import DeveloperProfileForm from "@/components/developer/DeveloperProfileForm";
import { createDeveloperUploadUrls } from "@/lib/actions/upload";
import { requireRole } from "@/lib/server/auth/require-role";
import { getDeveloperProfile } from "@/lib/server/developer/profile";
import { saveOwnProfileAction } from "./server/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("promotor.profile");
  return { title: t("title") };
}

export default async function PromotorProfilePage() {
  const { accountId } = await requireRole("developer");
  const profile = await getDeveloperProfile(accountId);
  if (!profile) notFound();
  const t = await getTranslations("promotor.profile");
  const format = await getFormatter();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("intro")}</p>
      </header>

      {profile.updatedBy?.role === "admin" && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("editedByAdmin", { date: format.dateTime(new Date(profile.updatedBy.at), { dateStyle: "long" }) })}
        </p>
      )}

      <DeveloperProfileForm
        defaultValues={profile.values}
        logoUrl={profile.logo}
        requestUploadUrls={createDeveloperUploadUrls}
        onSave={saveOwnProfileAction}
      />
    </div>
  );
}
