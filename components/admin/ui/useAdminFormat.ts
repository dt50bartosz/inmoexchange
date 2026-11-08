"use client";

import { useFormatter } from "next-intl";

/** Absolute dates only, so there is no "now" warning and server/browser output match. */
export function useAdminFormat() {
  const format = useFormatter();
  return {
    date: (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", year: "numeric" }),
    dateTime: (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    money: (n: number) => format.number(n, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
  };
}
