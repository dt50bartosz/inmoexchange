import { getTranslations } from "next-intl/server";
import { ctaOnDark, inner } from "./styles";

/** Dark launch-offer band. */
export default async function OfferBand() {
  const t = await getTranslations("developersLanding.offer");
  return (
    <section aria-labelledby="dev-offer-title" className="bg-dev-ink px-5 py-12 text-white sm:px-8 sm:py-16">
      <div className={`${inner} flex flex-col gap-6 md:flex-row md:items-center md:justify-between`}>
        <div className="max-w-2xl">
          <h2 id="dev-offer-title" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-3 leading-7 text-white/80">{t("text")}</p>
        </div>
        <a href="#solicitud" className={`${ctaOnDark} shrink-0`}>
          {t("cta")}
        </a>
      </div>
    </section>
  );
}
