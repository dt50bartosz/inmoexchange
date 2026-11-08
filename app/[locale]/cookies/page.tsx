// app/[locale]/cookies/page.tsx
// Cookie policy. The table lists every cookie the site sets; update it when one is added.
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Layout";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import { COOKIE_POLICY_VERSION } from "@/lib/cookie-consent";
import { COOKIE_INVENTORY } from "@/lib/cookie-inventory";

/** Date of the last change to this policy (shown on the page). Bump COOKIE_POLICY_VERSION too when consent must be asked again. */
const UPDATED = new Date(COOKIE_POLICY_VERSION);

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cookies.policy");
  return { title: t("title"), description: t("intro") };
}

export default async function CookiePolicyPage() {
  const t = await getTranslations("cookies.policy");
  const format = await getFormatter();

  return (
    // Top padding clears the navbar, which sits over the page
    <Container className="max-w-3xl pb-12 pt-14">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("updated", { date: format.dateTime(UPDATED, { dateStyle: "long" }) })} · {t("version", { version: COOKIE_POLICY_VERSION })}
      </p>

      <div className="mt-8 space-y-8 leading-relaxed">
        <p>{t("intro")}</p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t("usedTitle")}</h2>
          <p>{t("usedBody")}</p>
          <p>{t("categoriesBody")}</p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">{t("table.name")}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{t("table.provider")}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{t("table.purpose")}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{t("table.duration")}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{t("table.type")}</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">{t("table.consent")}</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_INVENTORY.map((c) => (
                  <tr key={c.name} className="border-t border-border align-top">
                    <td className="px-4 py-3 font-mono text-xs">{c.name}</td>
                    <td className="px-4 py-3">{c.provider}</td>
                    <td className="px-4 py-3">{t(`purpose.${c.purposeKey}`)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t(`duration.${c.durationKey}`)}</td>
                    <td className="px-4 py-3">{t(`category.${c.category}`)}</td>
                    <td className="px-4 py-3">{t(c.category === "necessary" ? "consentNo" : "consentYes")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">{t("prefixNote")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t("legalTitle")}</h2>
          <p>{t("legalBody")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t("manageTitle")}</h2>
          <p>{t("manageBody")}</p>
          <CookieSettingsButton label={t("changeSettings")} />
        </section>
      </div>
    </Container>
  );
}
