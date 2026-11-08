// app/[locale]/promotor/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import RegistrationsList from "@/components/developer/RegistrationsList";
import { PROMOTOR_ROUTES } from "@/lib/constants/routes";
import { requireRole } from "@/lib/server/auth/require-role";
import { getDeveloperDashboard } from "@/lib/server/developer/dashboard";
import { decideRegistrationAction } from "./registros/server/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("promotor.home");
  return { title: t("title") };
}

/** Developer panel home: developments, units by status and the latest client registrations. */
export default async function PromotorHomePage() {
  const { account, accountId } = await requireRole("developer");
  const t = await getTranslations("promotor.home");
  const d = await getDeveloperDashboard(accountId);

  const stats = [
    { label: t("stats.developments"), value: d.developments.total, hint: t("stats.developmentsHint", { published: d.developments.published, drafts: d.developments.drafts }) },
    { label: t("stats.available"), value: d.units.available },
    { label: t("stats.reserved"), value: d.units.reserved },
    { label: t("stats.sold"), value: d.units.sold },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("greeting", { name: account.name })}</h1>
        <p className="mt-1 text-muted-foreground">{t("intro")}</p>
      </header>

      {d.developments.preparedByPlatform > 0 && (
        <Link
          href={PROMOTOR_ROUTES.developments}
          className="flex items-start gap-2 rounded-lg border border-info/30 bg-info-soft px-4 py-3 text-sm text-info hover:underline"
        >
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("preparedByPlatform", { count: d.developments.preparedByPlatform })}
        </Link>
      )}

      <dl className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card p-5">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</dd>
            {s.hint && <dd className="mt-1 text-xs text-muted-foreground">{s.hint}</dd>}
          </div>
        ))}
      </dl>

      <section aria-labelledby="latest-registrations" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="latest-registrations" className="text-lg font-semibold">
            {t("latestRegistrations")}
            {d.pendingRegistrations > 0 && <span className="ml-2 text-sm font-normal text-warning">{t("pending", { count: d.pendingRegistrations })}</span>}
          </h2>
          <Link href="/promotor/registros" className="inline-flex items-center gap-1 text-sm font-medium text-brand-light hover:underline">
            {t("seeAll")}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <RegistrationsList registrations={d.latestRegistrations} decide={decideRegistrationAction} />
      </section>
    </div>
  );
}
