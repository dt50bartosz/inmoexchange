"use client";

import { Fragment, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import PanelCard from "@/components/panel/PanelCard";
import PanelSection from "@/components/panel/PanelSection";
import type { PropertyEventSource, PropertyStats as Stats, StatBreakdown } from "@/types/property-events";

const SOURCES: PropertyEventSource[] = ["network", "microsite", "public"];
const PERIODS = ["d7", "d30", "all"] as const;

/** Edit page: views and WhatsApp clicks of this property (read-only), above the form. */
export default function PropertyStats({ stats }: { stats: Stats }) {
  const t = useTranslations("panel.properties.stats");

  return (
    <PanelCard className="mb-6">
      <PanelSection title={t("title")} description={t("description")}>
        <div className="grid gap-6 lg:grid-cols-2">
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">{t("tableCaption")}</caption>
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th scope="col" className="pb-2 text-left font-medium">
                  <span className="sr-only">{t("measure")}</span>
                </th>
                {PERIODS.map((p) => (
                  <th key={p} scope="col" className="pb-2 text-right font-medium">
                    {t(`periods.${p}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Rows label={t("views")} b={stats.views} />
              <Rows label={t("whatsapp")} b={stats.whatsapp} />
            </tbody>
          </table>
          <DailyViews daily={stats.daily} />
        </div>
      </PanelSection>
    </PanelCard>
  );
}

/** One measure: its total row, then one smaller row per source. */
function Rows({ label, b }: { label: string; b: StatBreakdown }) {
  const t = useTranslations("panel.properties.stats");
  return (
    <Fragment>
      <tr className="border-t">
        <th scope="row" className="py-1.5 text-left font-semibold">
          {label}
        </th>
        {PERIODS.map((p) => (
          <td key={p} className="py-1.5 text-right font-semibold">
            {b.total[p]}
          </td>
        ))}
      </tr>
      {SOURCES.map((s) => (
        <tr key={s} className="text-muted-foreground">
          <th scope="row" className="py-0.5 pl-3 text-left font-normal">
            {t(`sources.${s}`)}
          </th>
          {PERIODS.map((p) => (
            <td key={p} className="py-0.5 text-right">
              {b.bySource[s][p]}
            </td>
          ))}
        </tr>
      ))}
    </Fragment>
  );
}

/**
 * Views per day, last 30 days: one series, so one colour (primary) and no legend; the title names it.
 * Columns grow from one baseline with rounded tops; hovering a day shows its value in the line above.
 * Screen readers get a summary, and everyone can open the numbers as a table.
 */
function DailyViews({ daily }: { daily: Stats["daily"] }) {
  const t = useTranslations("panel.properties.stats");
  const format = useFormatter();
  const [hover, setHover] = useState<number | null>(null);
  // Days are calendar dates ("2026-11-05"): show them as such, whatever the browser's time zone
  const date = (day: string) => format.dateTime(new Date(`${day}T12:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" });
  const total = daily.reduce((n, d) => n + d.views, 0);
  const max = Math.max(...daily.map((d) => d.views), 0);
  const shown = hover === null ? null : daily[hover];

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
        <h3 className="font-medium">{t("dailyTitle")}</h3>
        {/* What the pointer is on; otherwise the 30-day total */}
        <p className="text-muted-foreground tabular-nums" aria-hidden>
          {shown ? t("dayValue", { date: date(shown.day), n: shown.views }) : t("dailyTotal", { n: total })}
        </p>
      </div>

      {total === 0 ? (
        <p className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{t("noViews")}</p>
      ) : (
        <>
          <div role="img" aria-label={t("chartLabel", { n: total, max })} className="relative">
            <span className="absolute -top-0.5 left-0 text-[11px] text-muted-foreground tabular-nums" aria-hidden>
              {max}
            </span>
            <div className="flex h-24 items-end gap-[2px] border-b border-border pl-6" onMouseLeave={() => setHover(null)}>
              {daily.map((d, i) => (
                // The whole column is the hover target, bigger than the bar
                <div key={d.day} className="flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} aria-hidden>
                  {d.views > 0 && (
                    <div
                      className={`w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity ${hover !== null && hover !== i ? "opacity-40" : ""}`}
                      style={{ height: `${(d.views / max) * 100}%` }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-1 flex justify-between pl-6 text-[11px] text-muted-foreground" aria-hidden>
            <span>{date(daily[0].day)}</span>
            <span>{t("today")}</span>
          </div>

          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t("showTable")}</summary>
            <table className="mt-2 w-full tabular-nums">
              <caption className="sr-only">{t("dailyTitle")}</caption>
              <thead>
                <tr className="text-muted-foreground">
                  <th scope="col" className="text-left font-medium">
                    {t("day")}
                  </th>
                  <th scope="col" className="text-right font-medium">
                    {t("views")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.day} className={d.views === 0 ? "text-muted-foreground" : ""}>
                    <td>{date(d.day)}</td>
                    <td className="text-right">{d.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </div>
  );
}
