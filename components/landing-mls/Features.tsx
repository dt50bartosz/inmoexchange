import { getTranslations } from "next-intl/server";
import { Building2, LayoutTemplate, Network, Rss, Users } from "lucide-react";
import { eyebrow, inner, sectionPad, sectionTitle } from "./styles";

const FEATURES = [
  { key: "mls", icon: Network },
  { key: "feed", icon: Rss },
  { key: "crm", icon: Users },
  { key: "microsites", icon: LayoutTemplate },
  { key: "panel", icon: Building2 },
] as const;

/** Section 4: what's included. */
export default async function Features() {
  const t = await getTranslations("landing.features");

  return (
    <section aria-labelledby="features-title" className={`bg-white ${sectionPad}`}>
      <div className={inner}>
        <p className={eyebrow}>{t("eyebrow")}</p>
        <h2 id="features-title" className={`${sectionTitle} max-w-2xl`}>
          {t("title")}
        </h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li key={key} className="rounded-2xl border border-navy/10 p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-navy/5 text-navy">
                <Icon aria-hidden className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold text-navy">{t(`items.${key}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-6 text-navy/75">{t(`items.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
