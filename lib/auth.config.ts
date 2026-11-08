// lib/auth.config.ts
// The part of the auth setup that also runs in proxy.ts: no database, no password hashing.
// lib/auth.ts adds the login check on top of it.
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 }, // 7 days
  trustHost: true,
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role === "admin" || user.role === "developer" ? user.role : "agency";
        token.agencyId = user.agencyId ?? "";
        token.mustChangePassword = !!user.mustChangePassword;
        token.sessionVersion = user.sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = typeof token.id === "string" ? token.id : "";
      session.user.role = token.role === "admin" || token.role === "developer" ? token.role : "agency";
      session.user.agencyId = typeof token.agencyId === "string" ? token.agencyId : "";
      session.user.mustChangePassword = !!token.mustChangePassword;
      session.user.sessionVersion = typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
      return session;
    },
  },
};
