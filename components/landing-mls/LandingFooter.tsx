import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { inner } from "./styles";
import Wordmark from "./Wordmark";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/constants/contact";

const LINKS = [
  { key: "developers", href: "/promotoras" },
  { key: "legal", href: "/aviso-legal" },
  { key: "privacy", href: "/privacidad" },
  { key: "terms", href: "/terminos" },
  { key: "cookies", href: "/cookies" },
  { key: "contact", href: "/contacto" },
] as const;

/** Section 8: the landing's own footer (the site-wide one is hidden on this page, see components/PublicOnly.tsx). */
export default async function LandingFooter() {
  const t = await getTranslations("landing.footer");

  return (
    <footer className="border-t border-white/10 bg-navy px-5 text-white sm:px-8">
      <div className={`${inner} grid gap-8 py-12 md:grid-cols-[1fr_auto] md:items-start`}>
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-sm text-sm leading-6 text-white/70">{t("tagline")}</p>
          <a href={`tel:${CONTACT_PHONE.tel}`} className="inline-block text-sm font-medium text-white underline-offset-4 hover:underline">
            {t("phone")}: {CONTACT_PHONE.display}
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="block w-fit break-all text-sm font-medium text-white underline-offset-4 hover:underline">
            {CONTACT_EMAIL}
          </a>
        </div>

        <div className="space-y-6 md:text-right">
          <nav aria-label={t("nav")}>
            <ul className="flex flex-wrap gap-x-5 gap-y-3 text-sm md:justify-end">
              {LINKS.map((l) => (
                <li key={l.key}>
                  <Link href={l.href} className="text-white/80 underline-offset-4 hover:text-white hover:underline">
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <LanguageSwitcher onDark className="md:justify-end" />
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className={`${inner} py-6 text-xs text-white/60`}>{t("rights", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
