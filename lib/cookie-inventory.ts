// lib/cookie-inventory.ts
// Every cookie the site sets, in one place. The cookie policy table is built from this list, and
// withdrawing consent deletes the cookies of the withdrawn categories by these names.
// Add a cookie here before adding the code that sets it.

export const COOKIE_CATEGORIES = ["necessary", "analytics", "marketing"] as const;
export type CookieCategory = (typeof COOKIE_CATEGORIES)[number];
/** Categories that need the visitor's consent before anything in them loads. */
export const OPTIONAL_CATEGORIES = ["analytics", "marketing"] as const;
export type OptionalCategory = (typeof OPTIONAL_CATEGORIES)[number];

export interface CookieInfo {
  /** Exact name; on https the login cookies get a __Secure-/__Host- prefix (see the policy note). */
  name: string;
  provider: string;
  /** Key under cookies.policy.purpose in messages/*.json */
  purposeKey: string;
  category: CookieCategory;
  /** Key under cookies.policy.duration */
  durationKey: "days7" | "browserSession" | "year1";
}

export const COOKIE_INVENTORY: CookieInfo[] = [
  { name: "authjs.session-token", provider: "Colabora MLS", purposeKey: "session", category: "necessary", durationKey: "days7" },
  { name: "authjs.csrf-token", provider: "Colabora MLS", purposeKey: "csrf", category: "necessary", durationKey: "browserSession" },
  { name: "authjs.callback-url", provider: "Colabora MLS", purposeKey: "callback", category: "necessary", durationKey: "browserSession" },
  { name: "NEXT_LOCALE", provider: "Colabora MLS", purposeKey: "locale", category: "necessary", durationKey: "browserSession" },
  { name: "cookie_consent", provider: "Colabora MLS", purposeKey: "consent", category: "necessary", durationKey: "year1" },
];

export const cookiesIn = (category: CookieCategory) => COOKIE_INVENTORY.filter((c) => c.category === category);
