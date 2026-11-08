import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLandingStats } from "@/lib/server/landing-stats";
import { ctaOutlineOnDark, ctaPrimary, inner } from "./styles";
import Wordmark from "./Wordmark";
import heroImage from "@/public/index.webp";

/** Header + hero, on navy. The page's only H1. Counters come from the database and a counter at 0 is not shown. */
export default async function Hero() {
  const t = await getTranslations("landing");
  const format = await getFormatter();
  const stats = await getLandingStats();

  const counters = [
    { key: "agencies", value: stats.memberAgencies },
    { key: "properties", value: stats.sharedProperties },
  ].filter((c) => c.value > 0);

  return (
    <div className="relative isolate overflow-hidden bg-navy text-white">
      {/* Same photo as the index hero; decorative, so empty alt. Navy overlays keep the white text readable. */}
      <Image src={heroImage} alt="" fill priority sizes="100vw" placeholder="blur" className="-z-20 object-cover object-center" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-navy/95 via-navy/80 to-navy/40" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-navy/90 via-transparent to-navy/50" />

      <header className="px-5 sm:px-8">
        <div className={`${inner} flex items-center justify-between gap-4 py-5`}>
          <Wordmark priority />
          <div className="flex items-center gap-3 sm:gap-5">
            <LanguageSwitcher onDark />
            <Link href="/login" className="text-sm font-medium text-white/85 underline-offset-4 hover:text-white hover:underline">
              {t("nav.login")}
            </Link>
          </div>
        </div>
      </header>

      <section aria-labelledby="hero-title" className="px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16">
        <div className={inner}>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{t("hero.eyebrow")}</p>
            <h1 id="hero-title" className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">{t("hero.subtitle")}</p>

            {/* Both kinds of stock agencies get in the panel: resale (network search) and new builds (Obra nueva) */}
            <ul aria-label={t("hero.types.label")} className="mt-6 flex flex-wrap gap-2">
              {(["resale", "newBuild"] as const).map((k) => (
                <li key={k} className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                  {t(`hero.types.${k}`)}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/registro" className={ctaPrimary}>
                {t("hero.primaryCta")}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <a href="#como-funciona" className={ctaOutlineOnDark}>
                {t("hero.secondaryCta")}
              </a>
            </div>
            <p className="mt-5 text-sm text-white/70">{t("hero.trust")}</p>
          </div>

          {counters.length > 0 && (
            <dl aria-label={t("hero.statsLabel")} className="mt-12 flex flex-wrap gap-x-10 gap-y-6 border-t border-white/15 pt-8">
              {counters.map((c) => (
                <div key={c.key}>
                  <dt className="sr-only">{t(`hero.${c.key}`, { count: c.value })}</dt>
                  <dd className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tabular-nums sm:text-4xl">{format.number(c.value)}</span>
                    <span aria-hidden className="text-sm text-white/75">
                      {t(`hero.${c.key}`, { count: c.value })}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
    </div>
  );
}
