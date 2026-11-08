// lib/auth.ts
// Login with email + password (next-auth v5, JWT sessions). Server only.
import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { collections } from "@/lib/db";
import { verifyPassword } from "@/lib/server/passwords";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { recordLogin } from "@/lib/server/project-activity";
import type { UserRole } from "@/types/models";

/** The login form shows a message per code (see LoginForm). */
class LoginError extends CredentialsSignin {
  constructor(code: "invalid" | "suspended" | "rate_limited") {
    super();
    this.code = code;
  }
}

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

/**
 * Whether the session is still valid: the user exists and nothing has ended its sessions since login
 * (password changed or reset, "sign out everywhere", login email changed).
 */
export async function sessionIsCurrent(user: { id: string; sessionVersion: number }) {
  if (!ObjectId.isValid(user.id)) return false;
  const doc = await collections.users.findOne({ _id: new ObjectId(user.id) }, { projection: { sessionVersion: 1 } });
  return !!doc && (doc.sessionVersion ?? 0) === user.sessionVersion;
}

/** A login's role, from the users document. Missing (older documents) = agency. */
export function roleOf(user: { role?: string | null }): UserRole {
  return user.role === "admin" || user.role === "developer" ? user.role : "agency";
}

/** Suspended or cancelled agencies (and deleted ones) can't use the panel. */
export async function agencyCanLogIn(agencyId: string | null) {
  if (!agencyId || !ObjectId.isValid(agencyId)) return false;
  const agency = await collections.agencies.findOne({ _id: new ObjectId(agencyId) }, { projection: { status: 1 } });
  return !!agency && agency.status !== "suspended" && agency.status !== "cancelled";
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) throw new LoginError("invalid");
        const { email, password } = parsed.data;

        // 10 tries per email per 15 minutes
        if (!(await consumeRateLimit(`login:${email}`, 10, 15 * 60))) throw new LoginError("rate_limited");

        const user = await collections.users.findOne({ email });
        if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, password))) throw new LoginError("invalid");
        // Admins have no organisation; agency and developer logins need one that may use the network
        const role = roleOf(user);
        if (role !== "admin" && !(await agencyCanLogIn(user.agencyId))) throw new LoginError("suspended");

        await collections.users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
        // Developer CRM: a developer's login is part of its activity history (never blocks the login)
        if (role !== "admin") await recordLogin(user).catch((e) => console.error("recordLogin failed", e));
        return {
          id: user._id.toHexString(),
          email: user.email,
          role,
          agencyId: role !== "admin" ? user.agencyId ?? "" : "",
          mustChangePassword: !!user.mustChangePassword,
          sessionVersion: user.sessionVersion ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = await authConfig.callbacks!.jwt!(params);
      // After a password change the server calls unstable_update(): re-read the user, never trust the update's data
      if (params.trigger === "update" && token && typeof token.id === "string" && ObjectId.isValid(token.id)) {
        const user = await collections.users.findOne(
          { _id: new ObjectId(token.id) },
          { projection: { mustChangePassword: 1, sessionVersion: 1 } }
        );
        if (!user) return null;
        token.mustChangePassword = !!user.mustChangePassword;
        token.sessionVersion = user.sessionVersion ?? 0;
      }
      return token;
    },
  },
});
