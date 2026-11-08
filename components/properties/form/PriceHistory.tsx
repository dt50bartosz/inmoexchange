"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useFormatter, useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import FormField from "@/components/panel/FormField";
import type { Property, PropertyEditOutput, PropertyEditValues } from "@/types/property";

type Props = {
  form: UseFormReturn<PropertyEditValues, unknown, PropertyEditOutput>;
  property: Property;
  disabled?: boolean;
};

/** Edit page: current price, a "New price" field, and the list of earlier prices. */
export default function PriceHistory({ form, property, disabled }: Props) {
  const t = useTranslations("panel.properties.form.priceChange");
  const format = useFormatter();
  const newPrice = useWatch({ control: form.control, name: "newPrice" });
  const money = (n: number) => format.number(n, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const date = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric" });

  const since = property.priceHistory.at(-1)?.date ?? property.createdAt;
  const diff = newPrice != null ? newPrice - property.price : 0;
  const pct = format.number(Math.abs((diff / property.price) * 100), { maximumFractionDigits: 1 });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">{t("current")}</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums">{money(property.price)}</p>
          <p className="text-xs text-muted-foreground">{t("since", { date: date(since) })}</p>
        </div>
        <FormField label={t("new")} hint={t("newHint")} error={form.formState.errors.newPrice?.message}>
          {(p) => (
            <Controller
              control={form.control}
              name="newPrice"
              render={({ field }) => (
                <div className="relative">
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    disabled={disabled}
                    value={field.value ?? ""}
                    onChange={(ev) => field.onChange(ev.target.value === "" ? null : Number(ev.target.value))}
                    onBlur={field.onBlur}
                    className="pr-8"
                  />
                  <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                    €
                  </span>
                </div>
              )}
            />
          )}
        </FormField>
      </div>

      {newPrice != null && diff !== 0 && (
        <p aria-live="polite" className={`text-sm ${diff < 0 ? "text-success" : "text-warning"}`}>
          {t(diff < 0 ? "down" : "up", { amount: money(Math.abs(diff)), pct })} · {diff < 0 ? t("downNote") : t("upNote")}
        </p>
      )}

      {property.priceHistory.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("history")}</p>
          <ul className="divide-y rounded-lg border text-sm">
            {[...property.priceHistory].reverse().map((h, i) => (
              <li key={`${h.date}-${i}`} className="flex justify-between gap-4 px-3 py-2">
                <span className="text-muted-foreground">{t("until", { date: date(h.date) })}</span>
                <span className="tabular-nums">{money(h.price)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
