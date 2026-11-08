// lib/server/auth/require-role.ts
// The one access check for every layout and server action: requireRole("agency" | "developer" | "admin").
import "server-only";
import { cache } from "react";
import { ObjectId } from "mongodb";
import { getLocale } from "next-intl/server";
import { auth, roleOf, sessionIsCurrent } from "@/lib/auth";
import { collections } from "@/lib/db";
import { redirect } from "@/i18n/navigation";
import type { AgencyDoc, UserRole } from "@/types/models";
import type { Actor } from "@/types/developers";

/** Each role's panel home. A login on the wrong panel is sent to its own. */
export const ROLE_HOME: Record<UserRole, string> = {
  agency: "/panel",
  developer: "/promotor",
  admin: "/admin",
};

/** Which kind of organisation each org role must belong to (agencies.accountType, missing = agency). */
const ACCOUNT_TYPE = { agency: "agency", developer: "developer" } as const;

export type RoleContext<R extends UserRole> = {
  role: R;
  userId: string;
  email: string;
  /** The organisation (agencies._id hex) every query is scoped to; "" for admins. */
  accountId: string;
  /** The organisation document; null for admins. */
  account: R extends "admin" ? null : AgencyDoc;
  /** "Who" for audit fields and the activity log. */
  actor: Actor;
};

async function goTo(href: string): Promise<never> {
  redirect({ href, locale: await getLocale() });
  throw new Error("unreachable"); // redirect() throws
}

/**
 * The logged-in user, if they have this role. Everything is read from the database on every request,
 * never only from the session, so a role change or suspension takes effect straight away.
 * - not logged in → login page
 * - still on the emailed temporary password → choose a new one first
 * - session ended elsewhere (password changed, signed out everywhere) → login page
 * - another role → that role's own panel home
 * - organisation missing, suspended or cancelled → login page with a message
 */
async function check(role: UserRole): Promise<RoleContext<UserRole>> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || !ObjectId.isValid(id)) return goTo("/login");
  if (session.user.mustChangePassword) return goTo("/change-password");
  if (!(await sessionIsCurrent(session.user))) return goTo("/login?error=signed_out");

  const user = await collections.users.findOne(
    { _id: new ObjectId(id) },
    { projection: { role: 1, email: 1, agencyId: 1 } }
  );
  if (!user) return goTo("/login?error=signed_out");

  const actual = roleOf(user);
  if (actual !== role) return goTo(ROLE_HOME[actual]);

  const actor: Actor = { userId: id, email: user.email, role };
  if (role === "admin") return { role, userId: id, email: user.email, accountId: "", account: null, actor };

  const accountId = user.agencyId ?? "";
  const account = ObjectId.isValid(accountId) ? await collections.agencies.findOne({ _id: new ObjectId(accountId) }) : null;
  if (!account || account.status === "suspended" || account.status === "cancelled") return goTo("/login?error=suspended");
  // The login's role and the organisation's type must agree; if not, the account is set up wrongly: no access
  if ((account.accountType ?? "agency") !== ACCOUNT_TYPE[role]) return goTo("/login?error=suspended");

  return { role, userId: id, email: user.email, accountId, account, actor };
}

/** Cached per request and per role: a layout and its page share one check. */
const checkCached = cache(check);

export function requireRole<R extends UserRole>(role: R): Promise<RoleContext<R>> {
  return checkCached(role) as Promise<RoleContext<R>>;
}
