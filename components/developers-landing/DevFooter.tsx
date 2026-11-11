import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { inner } from "./styles";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/constants/contact";

const LINKS = [
  { key: "contact", href: "/contacto" },
  { key: "legal", href: "/aviso-legal" },
  { key: "privacy", href: "/privacidad" },
  { key: "terms", href: "/terminos" },
  { key: "cookies", href: "/cookies" },
] as const;

/** The page's own footer (the site-wide one is hidden here, see components/PublicOnly.tsx). */
export default async function DevFooter() {
  const t = await getTranslations("developersLanding.footer");
  return (
    <footer className="border-t border-dev-border bg-white px-5 sm:px-8">
      <div className={`${inner} flex flex-col gap-4 py-8 text-sm md:flex-row md:items-center md:justify-between`}>
        <div className="space-y-1">
          <a href={`tel:${CONTACT_PHONE.tel}`} className="inline-flex min-h-11 items-center font-medium text-dev-ink hover:underline">
            {t("phone")}: {CONTACT_PHONE.display}
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex min-h-11 w-fit items-center break-all font-medium text-dev-ink hover:underline">
            {CONTACT_EMAIL}
          </a>
          <p className="text-dev-muted">{t("rights", { year: new Date().getFullYear() })}</p>
        </div>
        <nav aria-label={t("nav")}>
          <ul className="-mx-2 flex flex-wrap">
            {LINKS.map((l) => (
              <li key={l.key}>
                <Link href={l.href} className="inline-flex min-h-11 items-center px-2 text-dev-muted underline-offset-4 hover:text-dev-ink hover:underline">
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
