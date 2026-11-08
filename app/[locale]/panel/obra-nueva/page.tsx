// app/[locale]/panel/obra-nueva/page.tsx
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Building2, Handshake, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import PageHeader from "@/components/panel/PageHeader";
import AgencyRegistrations from "@/components/new-builds/AgencyRegistrations";
import CollaborationText from "@/components/new-builds/CollaborationText";
import { requireRole } from "@/lib/server/auth/require-role";
import { listAgencyRegistrations, listNewBuilds } from "@/lib/server/new-builds";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("newBuilds");
  return { title: t("title") };
}

type Props = { searchParams: Promise<{ q?: string }> };

/** Agency panel → Obra nueva: published developments of active developers (read-only) and the agency's registrations. */
export default async function NewBuildsPage({ searchParams }: Props) {
  const { accountId } = await requireRole("agency");
  const { q = "" } = await searchParams;
  const query = q.slice(0, 60);
  const t = await getTranslations("newBuilds");
  const ts = await getTranslations("Projects.statuses");
  const format = await getFormatter();
  const [developments, registrations] = await Promise.all([listNewBuilds(query), listAgencyRegistrations(accountId)]);
  const money = (n: number, currency: string) => format.number(n, { style: "currency", currency, maximumFractionDigits: 0 });

  return (
    <div>
      <PageHeader title={t("title")} description={t("intro")} />

      <form role="search" className="mb-6 flex max-w-xl gap-2">
        <label htmlFor="nb-q" className="sr-only">{t("search")}</label>
        <Input id="nb-q" name="q" type="search" defaultValue={query} placeholder={t("searchPlaceholder")} />
        <Button type="submit" variant="outline">
          <Search aria-hidden className="size-4" />
          {t("search")}
        </Button>
      </form>

      {developments.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <Building2 aria-hidden className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">{query ? t("noResults") : t("empty")}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {developments.map((d) => (
            <li key={d.id}>
              <Link href={`/panel/obra-nueva/${d.id}`} className="block h-full overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md">
                <div className="aspect-[16/9] bg-muted">
                  {d.mainImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.mainImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="space-y-1.5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.developerName}</p>
                  <h2 className="font-semibold">{d.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[d.town, d.province].filter(Boolean).join(", ")} · {ts(d.status)}
                  </p>
                  {d.priceFrom !== null && (
                    <p className="text-sm font-medium tabular-nums">
                      {d.priceTo !== null && d.priceTo !== d.priceFrom
                        ? t("priceRange", { from: money(d.priceFrom, d.currency), to: money(d.priceTo, d.currency) })
                        : t("priceFrom", { from: money(d.priceFrom, d.currency) })}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm">
                    {d.unitsAvailable !== null && <span>{t("available", { count: d.unitsAvailable })}</span>}
                    <span className="inline-flex items-center gap-1 font-medium text-success">
                      <Handshake aria-hidden className="size-4" />
                      <CollaborationText c={d.collaboration} />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="my-registrations" className="mt-12 space-y-3">
        <h2 id="my-registrations" className="text-lg font-semibold">{t("myRegistrations")}</h2>
        <AgencyRegistrations registrations={registrations} showDevelopment />
      </section>
    </div>
  );
}
