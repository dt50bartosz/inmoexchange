// app/[locale]/promotor/promociones/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Building2, Info, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { AddedByPlatformBadge, VisibilityBadge } from "@/components/developer/DevelopmentBadges";
import { PROMOTOR_ROUTES } from "@/lib/constants/routes";
import { requireRole } from "@/lib/server/auth/require-role";
import { listProjects } from "@/lib/server/developer/developments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("promotor.developments");
  return { title: t("title") };
}

/** The developer's own developments (scoped by the session), drafts included. */
export default async function DevelopmentsPage() {
  const { accountId } = await requireRole("developer");
  const t = await getTranslations("promotor.developments");
  const ts = await getTranslations("Projects.statuses");
  const developments = await listProjects({ developerId: accountId });
  // Drafts Colabora MLS prepared for the developer, waiting for its check
  const toReview = developments.filter((d) => d.visibility === "draft" && d.createdBy?.role === "admin").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("intro")}</p>
        </div>
        <Link href={PROMOTOR_ROUTES.newDevelopment} className={buttonVariants()}>
          <Plus aria-hidden className="size-4" />
          {t("new")}
        </Link>
      </header>

      {toReview > 0 && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("toReview", { count: toReview })}
        </p>
      )}

      {developments.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <Building2 aria-hidden className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">{t("empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {developments.map((d) => (
            <li key={d.id}>
              <Link
                href={PROMOTOR_ROUTES.development(d.id)}
                className="block h-full overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <div className="aspect-[16/9] bg-muted">
                  {d.mainImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.mainImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <VisibilityBadge visibility={d.visibility} />
                    {d.createdBy?.role === "admin" ? <AddedByPlatformBadge /> : d.updatedBy?.role === "admin" && <AddedByPlatformBadge edited />}
                  </div>
                  <h2 className="font-semibold">{d.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[d.town, d.province].filter(Boolean).join(", ")} · {ts(d.status)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
