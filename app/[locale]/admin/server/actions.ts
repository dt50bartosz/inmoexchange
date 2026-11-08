// app/[locale]/admin/server/actions.ts
"use server";

import { signOut } from "@/lib/auth";

/* Actions shared by every admin page (the sidebar). */

/** "Log out" in the admin sidebar: ends the session and goes to the login page. */
export async function adminLogout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
