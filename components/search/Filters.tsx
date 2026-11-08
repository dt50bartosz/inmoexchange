"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import FormField from "@/components/panel/FormField";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { REGION_KEYS } from "@/lib/constants/options";
import { PROPERTY_CONDITIONS, PROPERTY_TYPES } from "@/lib/constants/property";
import { SEARCH_RADII_KM } from "@/lib/schemas/search";
import type { PlaceOption } from "@/types/locations";
import type { SearchFilters } from "@/types/search";
import PlaceAutocomplete from "./PlaceAutocomplete";

type Props = {
  filters: SearchFilters;
  /** Names of the locations in the URL, from the database. */
  places: PlaceOption[];
  onChange: (f: SearchFilters) => void;
  /** Search button (and Enter in a field): runs the search with these filters. */
  onSearch: () => void;
  /** Filters changed since the shown results: the Search button stands out. */
  dirty: boolean;
  /** Reset button: clears every filter and searches again. */
  onClear: () => void;
  canClear: boolean;
};

const CONDITION_OPTIONS = ["all", ...PROPERTY_CONDITIONS] as const;

const toNumber =(v: string) => (v === "" ? null : Math.max(0, Number(v)));

export default function Filters({ filters, places, onChange, onSearch, dirty, onClear, canClear }: Props) {
  const t = useTranslations("panel.search");
  const tp = useTranslations("panel.properties");
  const to = useTranslations("panel.options");
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch });

  // Places picked here or named by the server, by id: the filters themselves only hold ids
  const known = useRef(new Map<string, PlaceOption>());
  for (const p of places) known.current.set(p.id, p);
  const selected = filters.locations.flatMap((id) => known.current.get(id) ?? []);
  // "Within X km" needs a centre: a town or a place, not a province
  const canUseRadius = selected.length === 1 && selected[0].type !== "province";

  return (
    <form
      role="search"
      aria-label={t("filters.title")}
      className="space-y-4 rounded-xl border bg-card p-4 lg:sticky lg:top-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <h2 className="text-sm font-semibold">{t("filters.title")}</h2>

      {/* New build / resale: the first choice most buyers make, so it sits on top */}
      <div role="radiogroup" aria-label={t("filters.condition")} className="grid grid-cols-3 gap-1 rounded-lg border bg-muted p-1">
        {CONDITION_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={filters.condition === c}
            onClick={() => set({ condition: c })}
            className={`rounded-md px-2 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
              filters.condition === c ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {c === "all" ? t("filters.anyCondition") : tp(`conditions.${c}`)}
          </button>
        ))}
      </div>

      <FormField label={t("filters.location")}>
        {(p) => (
          <PlaceAutocomplete
            {...p}
            values={selected}
            placeholder={t("filters.locationPlaceholder")}
            onChange={(next) => {
              for (const place of next) known.current.set(place.id, place);
              const radius = next.length === 1 && next[0].type !== "province" ? filters.radiusKm : 0;
              set({ locations: next.map((place) => place.id), radiusKm: radius });
            }}
          />
        )}
      </FormField>

      <FormField label={t("filters.radius")} hint={canUseRadius ? undefined : t("filters.radiusHint")}>
        {(p) => (
          <SimpleSelect
            {...p}
            value={String(canUseRadius ? filters.radiusKm : 0)}
            disabled={!canUseRadius}
            onChange={(v) => set({ radiusKm: Number(v) })}
            options={SEARCH_RADII_KM.map((km) => ({ value: String(km), label: km === 0 ? t("filters.radiusNone") : t("filters.radiusKm", { km }) }))}
          />
        )}
      </FormField>

      <FormField label={t("filters.area")}>
        {(p) => (
          <SimpleSelect
            {...p}
            value={filters.area}
            onChange={(v) => set({ area: v as SearchFilters["area"] })}
            options={[{ value: "all", label: t("filters.anyArea") }, ...REGION_KEYS.map((v) => ({ value: v, label: to(`regions.${v}`) }))]}
          />
        )}
      </FormField>

      <FormField label={t("filters.type")}>
        {(p) => (
          <SimpleSelect
            {...p}
            value={filters.type}
            onChange={(v) => set({ type: v as SearchFilters["type"] })}
            options={[{ value: "all", label: t("filters.anyType") }, ...PROPERTY_TYPES.map((v) => ({ value: v, label: tp(`types.${v}`) }))]}
          />
        )}
      </FormField>

      <FormField label={t("filters.query")}>
        {(p) => <Input {...p} value={filters.query} onChange={(e) => set({ query: e.target.value })} placeholder={t("filters.queryPlaceholder")} />}
      </FormField>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t("filters.price")}</legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            aria-label={t("filters.minPrice")}
            placeholder={t("filters.min")}
            value={filters.minPrice ?? ""}
            onChange={(e) => set({ minPrice: toNumber(e.target.value) })}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            aria-label={t("filters.maxPrice")}
            placeholder={t("filters.max")}
            value={filters.maxPrice ?? ""}
            onChange={(e) => set({ maxPrice: toNumber(e.target.value) })}
          />
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <FormField label={t("filters.bedrooms")}>
          {(p) => (
            <SimpleSelect
              {...p}
              value={String(filters.minBeds)}
              onChange={(v) => set({ minBeds: Number(v) })}
              options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 0 ? t("filters.anyBeds") : t("filters.bedsPlus", { n }) }))}
            />
          )}
        </FormField>

        <FormField label={t("filters.bathrooms")}>
          {(p) => (
            <SimpleSelect
              {...p}
              value={String(filters.minBaths)}
              onChange={(v) => set({ minBaths: Number(v) })}
              options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 0 ? t("filters.anyBeds") : t("filters.bedsPlus", { n }) }))}
            />
          )}
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClear} disabled={!canClear}>
          <RotateCcw aria-hidden className="size-4" />
          {t("filters.reset")}
        </Button>
        <Button type="submit" variant={dirty ? "default" : "outline"}>
          <Search aria-hidden className="size-4" />
          {t("filters.search")}
        </Button>
      </div>
    </form>
  );
}
