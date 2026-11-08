import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Layout";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import Logo from "@/components/Logo";
import { CONTACT_PHONE } from "@/lib/constants/contact";

const linkClass = "text-white/70 transition-colors hover:text-white";

/** The public site's footer: a navy band that closes every page (hidden on the panel and admin by PublicOnly in the layout). */
export default async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("navbar");

  return (
    <footer className="bg-ink text-white">
      <Container className="grid gap-10 py-12 text-sm sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <Link href="/" aria-label={nav("home")} className="inline-block text-white">
            <Logo onDark className="h-10" />
          </Link>
          <p className="max-w-xs leading-6 text-white/70">{t("tagline")}</p>
          <a href={`tel:${CONTACT_PHONE.tel}`} className="inline-block font-medium text-white underline-offset-4 hover:underline">
            {t("phone")}: {CONTACT_PHONE.display}
          </a>
        </div>

        <nav aria-label={t("explore")} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white">{t("explore")}</h2>
          <ul className="space-y-2">
            <li><Link href="/listings" className={linkClass}>{t("listings")}</Link></li>
            <li><Link href="/#como-funciona" className={linkClass}>{t("howItWorks")}</Link></li>
            <li><Link href="/blog" className={linkClass}>{t("blog")}</Link></li>
            <li><Link href="/contacto" className={linkClass}>{t("contact")}</Link></li>
          </ul>
        </nav>

        <nav aria-label={t("agencies")} className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white">{t("agencies")}</h2>
          <ul className="space-y-2">
            <li><Link href="/registro" className={linkClass}>{t("join")}</Link></li>
            <li><Link href="/login" className={linkClass}>{t("login")}</Link></li>
          </ul>
        </nav>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:justify-between">
          <span>
            {t("rights", { year: new Date().getFullYear() })}
            <span aria-hidden> · </span>
            <Link href="/aviso-legal" className="hover:text-white">{t("legal")}</Link>
            <span aria-hidden> · </span>
            <Link href="/privacidad" className="hover:text-white">{t("privacy")}</Link>
            <span aria-hidden> · </span>
            <Link href="/terminos" className="hover:text-white">{t("terms")}</Link>
            <span aria-hidden> · </span>
            <Link href="/cookies" className="hover:text-white">{t("cookiePolicy")}</Link>
            <span aria-hidden> · </span>
            <CookieSettingsButton asLink label={t("cookieSettings")} className="hover:text-white" />
          </span>
          <span>{t("region")}</span>
        </Container>
      </div>
    </footer>
  );
}
