"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { PROPERTY_CONDITIONS, PROPERTY_STATUSES } from "@/lib/constants/property";
import type { Feed } from "@/lib/schemas/feed";

export type Filters = { query: string; status: string; source: string; condition: string };
export const EMPTY_FILTERS: Filters = { query: "", status: "all", source: "all", condition: "all" };

type Props = { filters: Filters; onChange: (f: Filters) => void; feeds: Feed[] };

export default function PropertiesToolbar({ filters, onChange, feeds }: Props) {
  const t = useTranslations("panel.properties");
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const statusOptions = [
    { value: "all", label: t("filters.allStatuses") },
    ...PROPERTY_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) })),
    { value: "hidden", label: t("filters.hidden") },
  ];
  const conditionOptions = [
    { value: "all", label: t("filters.allConditions") },
    ...PROPERTY_CONDITIONS.map((c) => ({ value: c, label: t(`conditions.${c}`) })),
  ];
  const sourceOptions = [
    { value: "all", label: t("filters.allSources") },
    { value: "manual", label: t("filters.manual") },
    ...feeds.map((f) => ({ value: f.id, label: t("filters.fromFeed", { name: f.name }) })),
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative sm:max-w-xs sm:flex-1">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder={t("filters.searchPlaceholder")}
          aria-label={t("filters.search")}
          className="pl-8"
        />
      </div>
      <SimpleSelect
        aria-label={t("filters.status")}
        value={filters.status}
        onChange={(status) => set({ status })}
        options={statusOptions}
        className="w-full sm:w-44"
      />
      <SimpleSelect
        aria-label={t("filters.condition")}
        value={filters.condition}
        onChange={(condition) => set({ condition })}
        options={conditionOptions}
        className="w-full sm:w-40"
      />
      <SimpleSelect
        aria-label={t("filters.source")}
        value={filters.source}
        onChange={(source) => set({ source })}
        options={sourceOptions}
        className="w-full sm:w-56"
      />
    </div>
  );
}
