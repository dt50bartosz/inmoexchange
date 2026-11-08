import type { Contact } from "@/types/crm";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Parses "YYYY-MM-DD" as a local date (not UTC) and full ISO strings as-is. */
export function toDate(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
}

export function toDayString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Whole days from today: negative = past, 0 = today, positive = future. */
export function dayDiff(value: string) {
  const ms = startOfDay(toDate(value)).getTime() - startOfDay(new Date()).getTime();
  return Math.round(ms / 86_400_000);
}

export function relativeDay(value: string) {
  const d = dayDiff(value);
  if (d === 0) return "today";
  if (d === -1) return "yesterday";
  if (d === 1) return "tomorrow";
  return d < 0 ? `${-d} days ago` : `in ${d} days`;
}

export function formatDate(value: string) {
  return toDate(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatDateTime(value: string) {
  return toDate(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function short(n: number) {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `€${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  return `€${Math.round(n / 1000)}k`;
}

export function formatBudget(min?: number, max?: number) {
  if (min && max) return `${short(min)}–${short(max)}`;
  if (max) return `Up to ${short(max)}`;
  if (min) return `From ${short(min)}`;
  return "No budget set";
}

export type FollowUpState = "overdue" | "today" | "upcoming" | "none";

export function followUpState(c: Contact): FollowUpState {
  if (!c.nextFollowUpAt || c.stage === "closed" || c.stage === "lost") return "none";
  const d = dayDiff(c.nextFollowUpAt);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  return "upcoming";
}

export function isDue(c: Contact) {
  const s = followUpState(c);
  return s === "overdue" || s === "today";
}

export function whatsappLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
