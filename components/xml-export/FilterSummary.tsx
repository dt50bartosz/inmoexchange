"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import type { XmlExportFilters } from "@/types/xmlExport";

/** Filters as small chips, e.g. "Costa Blanca South · Villa · €200,000–€700,000 · 3+ bd". */
export default function FilterSummary({ filters: f }: { filters: XmlExportFilters }) {
  const t = useTranslations("panel.xmlExport");
  const tp = useTranslations("panel.properties");
  const to = useTranslations("panel.options");
  const format = useFormatter();
  const money = (n: number) => format.number(n, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  const chips: string[] = [];
  if (f.query) chips.push(`“${f.query}”`);
  if (f.area !== "all") chips.push(to(`regions.${f.area}`));
  if (f.type !== "all") chips.push(tp(`types.${f.type}`));
  // Links saved before the new-build filter have no condition
  if (f.condition && f.condition !== "all") chips.push(tp(`conditions.${f.condition}`));
  if (f.minPrice != null && f.maxPrice != null) chips.push(`${money(f.minPrice)}–${money(f.maxPrice)}`);
  else if (f.minPrice != null) chips.push(t("summary.from", { price: money(f.minPrice) }));
  else if (f.maxPrice != null) chips.push(t("summary.upTo", { price: money(f.maxPrice) }));
  if (f.minBeds > 0) chips.push(t("summary.beds", { n: f.minBeds }));

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.length === 0 ? (
        <Badge variant="secondary">{t("summary.all")}</Badge>
      ) : (
        chips.map((c) => (
          <Badge key={c} variant="secondary">
            {c}
          </Badge>
        ))
      )}
    </div>
  );
}
