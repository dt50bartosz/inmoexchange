"use client";

import { useTranslations } from "next-intl";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import PageHeader from "@/components/panel/PageHeader";
import SimpleSelect from "@/components/panel/SimpleSelect";
import Pagination from "@/components/properties/list/Pagination";
import { ROUTES } from "@/lib/constants/routes";
import { toSearchQuery } from "@/lib/schemas/search";
import type { PlaceOption } from "@/types/locations";
import type { SearchFilters, SearchResults } from "@/types/search";
import Filters from "./Filters";
import PropertyCard from "./PropertyCard";
import { useUrlSearch } from "./useUrlSearch";

type Props = { filters: SearchFilters; places: PlaceOption[]; results: SearchResults };

/** Results come from the server (see app/[locale]/panel/buscar/page.tsx); this only changes the URL. */
export default function SearchPage({ filters, places, results }: Props) {
  const t = useTranslations("panel.search");
  const s = useUrlSearch(filters, ROUTES.search);
  const agencyById = (id: string) => results.agencies.find((a) => a.id === id);
  const searchQuery = toSearchQuery(filters, results.page);

  return (
    <div className="pb-16">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div>
          <Filters filters={s.draft} places={places} onChange={s.change} onSearch={s.search} dirty={s.dirty} onClear={s.clear} canClear={s.canClear} />
        </div>

        <section aria-labelledby="results-heading" aria-busy={s.pending} className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="text-sm font-medium" aria-live="polite">
              {t("results", { count: results.total })}
            </h2>
            <SimpleSelect
              aria-label={t("sort.label")}
              value={s.draft.sort}
              onChange={(v) => s.setSort(v as SearchFilters["sort"])}
              className="w-48"
              options={[
                { value: "newest", label: t("sort.newest") },
                { value: "priceAsc", label: t("sort.priceAsc") },
                { value: "priceDesc", label: t("sort.priceDesc") },
              ]}
            />
          </div>

          <div className={`transition-opacity ${s.pending ? "opacity-60" : ""}`}>
            {results.total === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
                <SearchX aria-hidden className="size-8 text-muted-foreground" />
                <p className="mt-4 font-medium">{t("empty.title")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("empty.body")}</p>
                {s.canClear && (
                  <Button type="button" variant="outline" className="mt-5" onClick={s.clear}>
                    {t("filters.clear")}
                  </Button>
                )}
              </div>
            ) : (
              <ul className="grid items-start gap-4 sm:grid-cols-2">
                {results.items.map((p) => (
                  <li key={p.id}>
                    <PropertyCard
                      property={p}
                      agency={agencyById(p.agencyId)}
                      searchQuery={searchQuery}
                      distance={p.distanceFromSearch != null && places[0] ? { km: p.distanceFromSearch, place: places[0].name } : undefined}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6">
            <Pagination page={results.page} pageCount={results.pageCount} onChange={s.goToPage} />
          </div>
        </section>
      </div>
    </div>
  );
}
