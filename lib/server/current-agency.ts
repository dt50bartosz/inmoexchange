// lib/server/current-agency.ts
import "server-only";
import { cache } from "react";
import { requireRole } from "@/lib/server/auth/require-role";
import type { AgencyDoc, CurrentAgency } from "@/types/models";

const toCurrentAgency = (a: AgencyDoc): CurrentAgency => ({
  id: a._id.toHexString(),
  name: a.name,
  slug: a.slug,
  logo: a.logo ?? null,
  email: a.email ?? null,
  subscriptionStatus: a.subscription?.status ?? "active",
  accountType: a.accountType ?? "agency",
});

/**
 * The logged-in agency (role "agency" only), read on every request: see requireRole for the checks
 * (not logged in, temporary password, session ended, suspended). A developer or admin login is sent to its own panel.
 */
export const getCurrentAgency = cache(async (): Promise<CurrentAgency> => {
  const { account } = await requireRole("agency");
  return toCurrentAgency(account);
});

/**
 * The same agency's id, for server actions and queries (CRM, properties, uploads).
 * Always read on the server, never taken from the browser.
 */
export const getAgencyId = cache(async (): Promise<string> => {
  const { id } = await getCurrentAgency();
  return id;
});

/**
 * The logged-in developer (role "developer") and the user acting.
 * Agency and admin logins are sent to their own panel.
 */
export const getCurrentDeveloper = cache(async () => {
  const { account, userId, email } = await requireRole("developer");
  return { developer: toCurrentAgency(account), user: { id: userId, email } };
});
