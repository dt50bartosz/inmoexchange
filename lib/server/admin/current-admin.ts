// lib/server/admin/current-admin.ts
import "server-only";
import { cache } from "react";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { collections } from "@/lib/db";
import { requireRole } from "@/lib/server/auth/require-role";

/**
 * The logged-in platform admin. Every admin helper and action calls this first,
 * because admin code can read and change every agency's data.
 * The checks are requireRole("admin")'s: not logged in → login page; an agency or developer login → its own panel.
 * The role is read from the database on every request, so turning an admin back into an agency login takes effect straight away.
 */
export const requireAdmin = cache(async () => {
  const { userId, email } = await requireRole("admin");
  return { id: userId, email };
});

/** For API routes: the logged-in admin, or null (no redirects). Same checks as requireAdmin. */
export async function adminOrNull(): Promise<{ id: string; email: string } | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id || !ObjectId.isValid(id) || session.user.mustChangePassword) return null;
  const user = await collections.users.findOne({ _id: new ObjectId(id) }, { projection: { role: 1, email: 1, sessionVersion: 1 } });
  if (!user || user.role !== "admin" || (user.sessionVersion ?? 0) !== session.user.sessionVersion) return null;
  return { id, email: user.email };
}
