// proxy.ts
// Locale routing (next-intl) + login and role check for the agency panel, developer panel and admin.
// The pages check again on the server (requireRole in lib/server/auth/require-role.ts); this only redirects early.
import NextAuth from "next-auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { authConfig } from "./lib/auth.config";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);
const { auth } = NextAuth(authConfig);

const locales = routing.locales as readonly string[];
const prefix = `^(/(${locales.join("|")}))?`;
const protectedPattern = new RegExp(`${prefix}/(panel|promotor|admin)(/.*)?$`);
const changePasswordPattern = new RegExp(`${prefix}/change-password/?$`);

/** Each role's own area (same as ROLE_HOME in lib/server/auth/require-role.ts, which can't run here). */
const AREA_OF_ROLE = { agency: "panel", developer: "promotor", admin: "admin" } as const;

/** "/pl/panel" → "/pl", "/panel" → "" (the default locale has no prefix). */
function localePrefix(pathname: string) {
  const first = pathname.split("/")[1];
  return locales.includes(first) && first !== routing.defaultLocale ? `/${first}` : "";
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;

  if (protectedPattern.test(pathname)) {
    if (!user) {
      const url = new URL(`${localePrefix(pathname)}/login`, req.url);
      url.searchParams.set("callbackUrl", pathname + search);
      return NextResponse.redirect(url);
    }
    if (user.mustChangePassword) {
      return NextResponse.redirect(new URL(`${localePrefix(pathname)}/change-password`, req.url));
    }
    // Another role's area → this login's own panel
    const area = pathname.match(protectedPattern)?.[3];
    const own = AREA_OF_ROLE[user.role] ?? "panel";
    if (area !== own) return NextResponse.redirect(new URL(`${localePrefix(pathname)}/${own}`, req.url));
  }
  if (changePasswordPattern.test(pathname) && !user) {
    return NextResponse.redirect(new URL(`${localePrefix(pathname)}/login`, req.url));
  }

  return intlMiddleware(req);
});

export const config = {
  // p/ = public client pages (own layout in app/p, no locale prefix)
  matcher: "/((?!api|feeds|p/|_next|.*\\..*).*)",
};
