import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types/models";

/** What the login session carries (see lib/auth.ts). Access is always re-checked on the server. */
type SessionUserFields = {
  /** The user's _id (hex). */
  id: string;
  /** "agency" → /panel only; "developer" → /promotor only; "admin" → /admin only. */
  role: UserRole;
  /** The organisation's _id (agencies, hex) for agency and developer logins; "" for admins. */
  agencyId: string;
  /** Still on the temporary password from the email: must choose a new one first. */
  mustChangePassword: boolean;
  /** Must match the user's sessionVersion in the database, or the session is over (password changed, signed out everywhere). */
  sessionVersion: number;
};

declare module "next-auth" {
  interface User extends Partial<SessionUserFields> {}
  interface Session {
    user: SessionUserFields & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends Partial<SessionUserFields> {}
}
