import { getTranslations } from "next-intl/server";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ctaPrimary, eyebrow, sectionPad, sectionTitle } from "./styles";

/** Section 5: one plan. The launch line shows only when landing.pricing.deadline is filled in the messages. */
export default async function Pricing() {
  const t = await getTranslations("landing.pricing");
  const deadline = t("deadline").trim();

  return (
    <section id="precio" aria-labelledby="pricing-title" className={`scroll-mt-4 border-y border-navy/10 bg-offwhite ${sectionPad}`}>
      <div className="mx-auto max-w-xl text-center">
        <p className={eyebrow}>{t("eyebrow")}</p>
        <h2 id="pricing-title" className={sectionTitle}>
          {t("title")}
        </h2>

        <div className="mt-10 rounded-3xl border border-navy/10 bg-white p-8 text-left shadow-sm sm:p-10">
          <p className="text-4xl font-bold tracking-tight text-terracotta sm:text-5xl">{t("free")}</p>
          <p className="mt-3 text-lg font-medium text-navy">{t("after")}</p>

          <ul className="mt-6 space-y-3 border-t border-navy/10 pt-6 text-navy/80">
            {(["account", "terms"] as const).map((k) => (
              <li key={k} className="flex gap-3">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-navy" />
                {t(k)}
              </li>
            ))}
          </ul>

          <Link href="/registro" className={`${ctaPrimary} mt-8 w-full`}>
            {t("cta")}
            <ArrowRight aria-hidden className="size-4" />
          </Link>

          {deadline && <p className="mt-4 text-center text-xs text-navy/60">{t("launch", { fecha: deadline })}</p>}
        </div>
      </div>
    </section>
  );
}
