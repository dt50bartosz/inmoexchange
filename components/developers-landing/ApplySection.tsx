import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import ContactPhoneButtons from "@/components/ContactPhoneButtons";
import { ctaOutline, ctaPrimary, inner, sectionPad, sectionTitle } from "./styles";

/** The application form's section (#solicitud). The form itself is passed in by the page. */
export default async function ApplySection({ children }: { children?: ReactNode }) {
  const t = await getTranslations("developersLanding.apply");
  return (
    <section id="solicitud" aria-labelledby="dev-apply-title" className={`scroll-mt-4 bg-dev-light ${sectionPad}`}>
      <div className={`${inner} max-w-3xl`}>
        <h2 id="dev-apply-title" className={sectionTitle}>
          {t("title")}
        </h2>
        <p className="mt-3 leading-7 text-dev-muted">{t("text")}</p>
        {/* Prefer to talk first: our phone / WhatsApp (lib/constants/contact.ts) */}
        <p className="mt-6 text-sm font-medium text-dev-ink">{t("preferTalk")}</p>
        <ContactPhoneButtons
          className="mt-3"
          whatsappMessage={t("whatsappMessage")}
          labels={{ call: t("call"), whatsapp: t("whatsapp") }}
          whatsappClassName={ctaPrimary}
          callClassName={ctaOutline}
        />
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
