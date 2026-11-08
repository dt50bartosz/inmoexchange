"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

type Props = { iso: string | null; mode?: "date" | "dateTime"; empty?: string; className?: string };

/**
 * A stored (UTC) time in the viewer's own time zone. The server doesn't know that zone, so it renders
 * UTC (marked as such) and the browser switches to local time right after loading: no hydration mismatch.
 */
export default function LocalTime({ iso, mode = "dateTime", empty = "—", className }: Props) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false);
  if (!iso) return <span className={className}>{empty}</span>;
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions =
    mode === "date"
      ? { day: "numeric", month: "short", year: "numeric" }
      : { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };
  const text = new Intl.DateTimeFormat("en-GB", inBrowser ? options : { ...options, timeZone: "UTC" }).format(date);
  return (
    <time dateTime={iso} className={className} title={date.toISOString().replace("T", " ").slice(0, 16) + " UTC"}>
      {text}
      {!inBrowser && mode === "dateTime" ? " UTC" : ""}
    </time>
  );
}
