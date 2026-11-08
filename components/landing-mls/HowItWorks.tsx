import { getTranslations } from "next-intl/server";
import { Handshake, Rss, ShieldCheck } from "lucide-react";
import { eyebrow, inner, sectionPad, sectionTitle } from "./styles";

const STEPS = [
  { key: "verify", icon: ShieldCheck },
  { key: "feed", icon: Rss },
  { key: "collaborate", icon: Handshake },
] as const;

/** Section 2: three numbered steps. Target of the hero's "Cómo funciona". */
export default async function HowItWorks() {
  const t = await getTranslations("landing.how");

  return (
    <section id="como-funciona" aria-labelledby="how-title" className={`scroll-mt-4 bg-white ${sectionPad}`}>
      <div className={inner}>
        <p className={eyebrow}>{t("eyebrow")}</p>
        <h2 id="how-title" className={sectionTitle}>
          {t("title")}
        </h2>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ key, icon: Icon }, i) => (
            <li key={key} className="rounded-2xl border border-navy/10 bg-offwhite p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-navy text-white">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="text-sm font-semibold tabular-nums text-navy/60">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-navy">{t(`steps.${key}.title`)}</h3>
              <p className="mt-2 leading-7 text-navy/75">{t(`steps.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
