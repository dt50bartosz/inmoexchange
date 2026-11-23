// lib/cookie-consent.ts
// The visitor's cookie choice, kept in a cookie so the server can read it too.
// Anything optional (analytics, marketing…) must load through <ConsentGate> (components/ConsentGate.tsx),
// which renders it only while that category is accepted. Nothing optional is installed today.

import { COOKIE_INVENTORY, OPTIONAL_CATEGORIES, type OptionalCategory } from "@/lib/cookie-inventory";

export const CONSENT_COOKIE = "cookie_consent";
/** Consent is asked again after a year (AEPD guidance: renew it periodically). */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;
/**
 * Version of the cookie policy. Change it when the policy changes in a way that needs new consent
 * (e.g. a new optional cookie): every saved choice with another version is ignored and the banner shows again.
 */
// 2026-11-23: new "functional" category (a material change: everyone is asked again)
export const COOKIE_POLICY_VERSION = "2026-11-23";

export type ConsentChoices = Record<OptionalCategory, boolean>;
export type Consent = ConsentChoices & {
  /** Random id, the same in the visitor's cookie and in the saved consent record. */
  id: string;
  version: string;
};

/** Fired with `{ configure: boolean }` to show the banner again ("Cookie settings"). */
export const OPEN_SETTINGS_EVENT = "cookie-settings:open";
/** Fired after the choice changes, so <ConsentGate> can load or unload. */
export const CONSENT_CHANGED_EVENT = "cookie-consent:changed";

/* Cookie value: "<version>.<id>.<functional 0|1><analytics 0|1><marketing 0|1>" (one digit per OPTIONAL_CATEGORIES entry) */

function decode(raw: string): Consent | null {
  const m = /^([\w-]+)\.([\w-]+)\.([01]+)$/.exec(raw);
  // Old policy version (or another number of categories): ask again
  if (!m || m[1] !== COOKIE_POLICY_VERSION || m[3].length !== OPTIONAL_CATEGORIES.length) return null;
  const choices = Object.fromEntries(OPTIONAL_CATEGORIES.map((c, i) => [c, m[3][i] === "1"])) as ConsentChoices;
  return { ...choices, version: m[1], id: m[2] };
}

/** The saved choice for the current policy version, or null (no choice yet → show the banner). */
export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))?.[1];
  return raw ? decode(decodeURIComponent(raw)) : null;
}

/** Same check on the server, from the request's cookie value. */
export const parseConsentCookie = (raw: string | undefined) => (raw ? decode(raw) : null);

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * Saves the choice in the cookie. Categories that were accepted and are now refused get their cookies
 * deleted and the page reloads, so scripts that already ran stop. Returns the saved consent.
 */
export function saveConsent(choices: ConsentChoices): Consent {
  const before = readConsent();
  const consent: Consent = { ...choices, id: before?.id ?? newId(), version: COOKIE_POLICY_VERSION };
  const secure = location.protocol === "https:" ? "; Secure" : "";
  const value = `${consent.version}.${consent.id}.${OPTIONAL_CATEGORIES.map((c) => (consent[c] ? 1 : 0)).join("")}`;
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;

  const withdrawn = OPTIONAL_CATEGORIES.filter((c) => before?.[c] && !choices[c]);
  if (withdrawn.length) {
    for (const cookie of COOKIE_INVENTORY.filter((c) => (withdrawn as string[]).includes(c.category))) {
      document.cookie = `${cookie.name}=; Path=/; Max-Age=0`;
      document.cookie = `${cookie.name}=; Path=/; Max-Age=0; Domain=.${location.hostname.replace(/^www\./, "")}`;
    }
    location.reload();
  } else {
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
  }
  return consent;
}

export const hasConsent = (category: OptionalCategory) => !!readConsent()?.[category];

/** Shows the banner again; `configure` opens the per-category choices directly. */
export const openCookieSettings = (configure = true) =>
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: { configure } }));
