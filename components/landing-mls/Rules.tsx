import { getTranslations } from "next-intl/server";
import { BadgeCheck, Scale, ShieldCheck } from "lucide-react";
import { eyebrow, inner, sectionPad, sectionTitle } from "./styles";

const RULES = [
  { key: "consent", icon: ShieldCheck },
  { key: "verified", icon: BadgeCheck },
  { key: "conditions", icon: Scale },
] as const;

/** Section 3: the network's rules. Short and human. */
export default async function Rules() {
  const t = await getTranslations("landing.rules");

  return (
    <section id="reglas" aria-labelledby="rules-title" className={`scroll-mt-4 border-y border-navy/10 bg-offwhite ${sectionPad}`}>
      <div className={`${inner} grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16`}>
        <div>
          <p className={eyebrow}>{t("eyebrow")}</p>
          <h2 id="rules-title" className={sectionTitle}>
            {t("title")}
          </h2>
          <p className="mt-4 leading-7 text-navy/75">{t("subtitle")}</p>
        </div>

        <ul className="divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">
          {RULES.map(({ key, icon: Icon }) => (
            <li key={key} className="flex gap-4 p-5 sm:p-6">
              <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-terracotta" />
              <p className="leading-7 text-navy/80">
                <strong className="font-semibold text-navy">{t(`items.${key}.strong`)}</strong> {t(`items.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
