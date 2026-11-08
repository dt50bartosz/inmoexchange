import { dayDiff } from "../crm/utils";
import type { ClientPage, ShortlistItem } from "@/types/client-pages";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/\/+$/, "");

/** The public link the agent sends: /p/<random token>. The token is made on the server. */
export function pageUrl(page: Pick<ClientPage, "token">) {
  return `${BASE_URL}/p/${page.token}`;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}

const eur = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
export const formatPrice = (n: number) => eur.format(n);

export type EffectiveStatus = "live" | "paused" | "expired";

export function effectiveStatus(p: ClientPage): EffectiveStatus {
  if (p.expiresAt && dayDiff(p.expiresAt) < 0) return "expired";
  return p.status;
}

export function hasClientActivity(i: ShortlistItem) {
  return Boolean(i.reaction || i.clientComment || i.viewingRequestedAt);
}

export function newActivityCount(p: ClientPage) {
  return p.items.filter((i) => !i.seenByAgent && hasClientActivity(i)).length;
}

export function whatsappShareLink(page: ClientPage) {
  const name = firstName(page.buyerName);
  const greeting = name ? `Hi ${name}` : "Hi";
  const text = `${greeting}, here's your personal shortlist of homes: ${pageUrl(page)}`;
  // wa.me needs the number in international format, digits only, with no leading "00".
  const phone = (page.buyerPhone ?? "").replace(/\D/g, "").replace(/^00/, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}