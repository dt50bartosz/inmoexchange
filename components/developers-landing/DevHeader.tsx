import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import { inner } from "./styles";

/** The page's own header (the site navbar is hidden here, see components/PublicOnly.tsx). Phones: logo + login, links below. */
export default async function DevHeader() {
  const t = await getTranslations("developersLanding");
  const links = [
    { key: "agencies", href: "/" },
    { key: "developers", href: "/promotoras", current: true },
    { key: "contact", href: "/contacto" },
  ] as const;

  return (
    <header className="border-b border-dev-border bg-white px-5 sm:px-8">
      <div className={`${inner} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3`}>
        <Link href="/" aria-label={t("nav.home")} className="inline-flex min-h-11 items-center">
          <Logo priority className="h-9" />
        </Link>

        <nav aria-label={t("nav.label")} className="order-last w-full md:order-none md:w-auto">
          <ul className="-mx-2 flex gap-1 overflow-x-auto text-sm">
            {links.map((l) => (
              <li key={l.key}>
                <Link
                  href={l.href}
                  aria-current={"current" in l ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-2 font-medium ${
                    "current" in l ? "text-dev-accent" : "text-dev-muted hover:text-dev-ink"
                  }`}
                >
                  {t(`nav.${l.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSwitcher className="[&_button]:min-h-11 [&_button]:min-w-9" />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-lg border border-dev-border px-4 text-sm font-semibold text-dev-ink hover:border-dev-ink/40"
          >
            {t("nav.login")}
          </Link>
        </div>
      </div>
    </header>
  );
}
