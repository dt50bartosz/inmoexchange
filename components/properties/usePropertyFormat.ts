"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { Property } from "@/lib/schemas/property";

/** Display helpers that follow the panel's language. */
export function usePropertyFormat() {
  const t = useTranslations("panel.properties");
  const format = useFormatter();

  return {
    title: (p: Pick<Property, "type" | "town">) =>
      t("titleFormat", { type: t(`types.${p.type}`), town: p.town || t("noTown") }),
    price: (n: number) => format.number(n, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
    relative: (iso: string) => format.relativeTime(new Date(iso)),
    /** Kilometres with one decimal: "2.4" (en), "2,4" (es). */
    km: (n: number) => format.number(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  };
}
