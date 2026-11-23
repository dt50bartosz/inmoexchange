import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import LandingNav from "./LandingNav";
import { ctaOutlineOnDark, ctaPrimary, inner } from "./styles";
import Wordmark from "./Wordmark";
import heroImage from "@/public/index.webp";

/** Header + hero, on navy. The page's only H1. (No agency / property counters: removed on request, 2026-11-23.) */
export default async function Hero() {
  const t = await getTranslations("landing");

  return (
    <div className="relative isolate overflow-hidden bg-navy text-white">
      {/* Same photo as the index hero; decorative, so empty alt. Navy overlays keep the white text readable. */}
      <Image src={heroImage} alt="" fill priority sizes="100vw" placeholder="blur" className="-z-20 object-cover object-center" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-navy/95 via-navy/80 to-navy/40" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-navy/90 via-transparent to-navy/50" />

      <header className="relative z-30 px-5 sm:px-8">
        <div className={`${inner} flex items-center justify-between gap-4 py-5`}>
          <Wordmark priority />
          <LandingNav />
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
        </div>
      </section>
    </div>
  );
}
