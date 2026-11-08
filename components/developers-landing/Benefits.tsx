import { getTranslations } from "next-intl/server";
import { Handshake, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { inner, sectionPad, sectionTitle } from "./styles";

const ITEMS = [
  { key: "reach", Icon: Users },
  { key: "pro", Icon: ShieldCheck },
  { key: "upload", Icon: SlidersHorizontal },
  { key: "direct", Icon: Handshake },
] as const;

/** "Qué ganas publicando en Colabora": only what developer accounts can do today. */
export default async function Benefits() {
  const t = await getTranslations("developersLanding.benefits");
  return (
    <section aria-labelledby="dev-benefits-title" className={`bg-white ${sectionPad}`}>
      <div className={inner}>
        <h2 id="dev-benefits-title" className={`${sectionTitle} max-w-2xl`}>
          {t("title")}
        </h2>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(({ key, Icon }) => (
            <li key={key} className="rounded-xl border border-dev-border p-6">
              <span aria-hidden className="grid size-10 place-items-center rounded-lg bg-dev-light text-dev-accent">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-dev-ink">{t(`items.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-dev-muted">{t(`items.${key}.text`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
