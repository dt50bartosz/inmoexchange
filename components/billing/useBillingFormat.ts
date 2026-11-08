"use client";

import { useFormatter } from "next-intl";

export function useBillingFormat() {
  const format = useFormatter();
  return {
    money: (cents: number, currency = "EUR") => format.number(cents / 100, { style: "currency", currency }),
    date: (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric" }),
  };
}

export const withVat = (cents: number, rate: number) => Math.round(cents * (1 + rate));
export const daysUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
