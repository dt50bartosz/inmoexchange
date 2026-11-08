import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import { inner, sectionPad, sectionTitle } from "./styles";

const STEPS = ["request", "publish", "contact"] as const;

/** "Cómo funciona" (#como-funciona): 3 numbered steps and the "not a buyers' portal" note. */
export default async function DevHowItWorks() {
  const t = await getTranslations("developersLanding.how");
  return (
    <section id="como-funciona" aria-labelledby="dev-how-title" className={`scroll-mt-4 bg-dev-light ${sectionPad}`}>
      <div className={inner}>
        <h2 id="dev-how-title" className={sectionTitle}>
          {t("title")}
        </h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((k, i) => (
            <li key={k} className="rounded-xl border border-dev-border bg-white p-6">
              <span aria-hidden className="font-display text-3xl font-semibold text-dev-accent">
                {i + 1}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold text-dev-ink">{t(`steps.${k}.title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-dev-muted">{t(`steps.${k}.text`)}</p>
            </li>
          ))}
        </ol>
        <aside className="mt-8 flex gap-4 rounded-xl border border-dev-accent/30 bg-white p-5 sm:p-6">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-dev-accent" />
          <div>
            <h3 className="font-semibold text-dev-ink">{t("note.title")}</h3>
            <p className="mt-1 text-sm leading-6 text-dev-muted">{t("note.text")}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
