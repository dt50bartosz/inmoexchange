// app/[locale]/panel/server/actions.ts
"use server";

import { signOut } from "@/lib/auth";

/*
 * Actions shared by every panel page (the top bar).
 */

/** "Log out" in the top bar: ends the session and goes to the login page. */
export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
