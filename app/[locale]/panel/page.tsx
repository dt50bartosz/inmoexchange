// app/[locale]/panel/page.tsx
import type { Metadata } from "next";
import { Home, Search, Upload } from "lucide-react";
import { getTranslations, getFormatter, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { getCurrentAgency } from "@/lib/server/current-agency";
import { DASHBOARD_DAYS as DAYS, getPanelDashboard } from "@/lib/server/property-events";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PanelHome" });
  return { title: t("metaTitle") };
}

export default async function PanelHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("PanelHome");
  const format = await getFormatter();

  const [agency, { activeCount, viewsCount, contactsCount, viewers }] = await Promise.all([
    getCurrentAgency(),
    getPanelDashboard(),
  ]);

  const stats = [
    { key: "active", label: t("stats.active"), value: activeCount },
    { key: "views", label: t("stats.views", { days: DAYS }), value: viewsCount },
    { key: "contacts", label: t("stats.contacts", { days: DAYS }), value: contactsCount },
  ];

  const actions = [
    { href: ROUTES.newProperty, label: t("actions.addProperty"), icon: Home },
    { href: ROUTES.search, label: t("actions.searchNetwork"), icon: Search },
    { href: ROUTES.propertyFeeds, label: t("actions.importXml"), icon: Upload },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{agency.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { days: DAYS })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map(({ href, label, icon: Icon }, i) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                i === 0
                  ? "border-transparent bg-primary text-white hover:bg-primary-hover"
                  : "border-border-strong bg-card text-foreground hover:bg-accent"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </header>

      <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.key} className="bg-card p-5">
            <dt className="text-sm text-muted-foreground">{s.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{format.number(s.value)}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="viewers-title" className="rounded-lg border border-border bg-card">
        <h2 id="viewers-title" className="border-b border-border px-5 py-4 font-semibold">
          {t("viewers.title")}
        </h2>

        {viewers.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">{t("viewers.empty", { days: DAYS })}</p>
            {activeCount === 0 && (
              <Link
                href={ROUTES.newProperty}
                className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-2"
              >
                {t("viewers.addFirst")}
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {viewers.map((v) => (
              <li key={v.id} className="flex items-center gap-4 px-5 py-4">
                {v.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.logo} alt="" className="h-9 w-9 shrink-0 rounded object-contain" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-secondary text-sm font-semibold text-secondary-foreground">
                    {v.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{v.name}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {t("viewers.views", { count: v.views })}
                    {v.lastPropertyRef && <> · {t("viewers.last", { ref: v.lastPropertyRef })}</>}
                  </p>
                </div>
                <time dateTime={v.lastViewedAt} className="shrink-0 text-sm text-muted-foreground">
                  {format.dateTime(new Date(v.lastViewedAt), {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Europe/Madrid",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
