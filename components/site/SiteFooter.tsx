import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Layout";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import Logo from "@/components/Logo";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/constants/contact";

const linkClass = "text-white/75 transition-colors hover:text-white";

/** The public website's footer. The agency panel keeps components/Footer.tsx, so changes here never reach it. */
export default async function SiteFooter() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("navbar");

  return (
    <footer className="bg-ink text-white">
      <Container className="grid gap-12 py-16 text-base md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-4">
          <Link href="/" aria-label={nav("home")} className="inline-block text-white">
            <Logo onDark className="h-12" />
          </Link>
          <p className="max-w-sm leading-7 text-white/75">{t("tagline")}</p>
          <a href={`tel:${CONTACT_PHONE.tel}`} className="inline-block font-medium text-white underline-offset-4 hover:underline">
            {t("phone")}: {CONTACT_PHONE.display}
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="block w-fit break-all font-medium text-white underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>
        </div>

        <nav aria-label={t("explore")} className="space-y-4">
          <h2 className="font-semibold text-white">{t("explore")}</h2>
          <ul className="space-y-3">
            <li><Link href="/listings" className={linkClass}>{t("listings")}</Link></li>
            <li><Link href="/#como-funciona" className={linkClass}>{t("howItWorks")}</Link></li>
            <li><Link href="/blog" className={linkClass}>{t("blog")}</Link></li>
            <li><Link href="/contacto" className={linkClass}>{t("contact")}</Link></li>
          </ul>
        </nav>

        <nav aria-label={t("agencies")} className="space-y-4">
          <h2 className="font-semibold text-white">{t("agencies")}</h2>
          <ul className="space-y-3">
            <li><Link href="/registro" className={linkClass}>{t("join")}</Link></li>
            <li><Link href="/login" className={linkClass}>{t("login")}</Link></li>
          </ul>
        </nav>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-4 py-6 text-sm text-white/70 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span>{t("rights", { year: new Date().getFullYear() })}</span>
            <Link href="/aviso-legal" className="hover:text-white">{t("legal")}</Link>
            <Link href="/privacidad" className="hover:text-white">{t("privacy")}</Link>
            <Link href="/terminos" className="hover:text-white">{t("terms")}</Link>
            <Link href="/cookies" className="hover:text-white">{t("cookiePolicy")}</Link>
            <CookieSettingsButton asLink label={t("cookieSettings")} className="hover:text-white" />
          </div>
          <span>{t("region")}</span>
        </Container>
      </div>
    </footer>
  );
}
