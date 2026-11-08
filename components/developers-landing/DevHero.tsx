import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Lock, MapPin } from "lucide-react";
import { ctaOutline, ctaPrimary, eyebrow, inner } from "./styles";
import heroDev from "@/public/heroDev.webp";

/** Hero: the page's only H1, and an example listing card (static, labelled as an example, nothing from the database). */
export default async function DevHero() {
  const t = await getTranslations("developersLanding.hero");
  const c = await getTranslations("developersLanding.card");

  return (
    <section aria-labelledby="dev-hero-title" className="bg-dev-light px-5 py-14 sm:px-8 sm:py-24">
      <div className={`${inner} grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_420px]`}>
        <div>
          <p className={eyebrow}>{t("eyebrow")}</p>
          <h1 id="dev-hero-title" className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-dev-ink sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-dev-muted sm:text-lg sm:leading-8">{t("subtitle")}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#solicitud" className={ctaPrimary}>
              {t("primaryCta")}
              <ArrowRight aria-hidden className="size-4" />
            </a>
            <a href="#como-funciona" className={ctaOutline}>
              {t("secondaryCta")}
            </a>
          </div>
        </div>

        {/* Illustrative only: what an agency sees (labelled "Ejemplo"; nothing from the database). */}
        <figure aria-label={c("label")} className="overflow-hidden rounded-[14px] border border-dev-border bg-white shadow-sm">
          <div className="relative aspect-[16/10] bg-dev-border/60">
            <Image src={heroDev} alt={c("photo")} fill priority placeholder="blur" sizes="(min-width: 1024px) 420px, 100vw" className="object-cover" />
            <span className="absolute top-3 right-3 rounded-md bg-dev-ink px-2 py-0.5 text-xs font-semibold text-white">{c("example")}</span>
            <ul className="absolute top-3 left-3 flex gap-1.5">
              {(["developer", "newBuild"] as const).map((k) => (
                <li key={k} className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-dev-ink">
                  {c(k)}
                </li>
              ))}
            </ul>
          </div>
          <figcaption className="space-y-3 p-5">
            <div>
              <p className="font-display text-lg font-semibold text-dev-ink">{c("name")}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-dev-muted">
                <MapPin aria-hidden className="size-4" />
                {c("place")}
              </p>
            </div>
            <p className="font-display text-xl font-semibold text-dev-ink">{c("from")}</p>
            <div className="flex items-start gap-3 rounded-lg border border-dev-border bg-dev-light p-3 text-sm">
              <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-dev-accent" />
              <p>
                <span className="font-semibold text-dev-ink">{c("lockTitle")}:</span> <span className="text-dev-muted">{c("lockText")}</span>
              </p>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
