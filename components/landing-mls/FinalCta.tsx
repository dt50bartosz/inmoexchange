import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ctaPrimary } from "./styles";
import WhatsAppButton from "./WhatsAppButton";

/** Section 7: closing call to action on navy. */
export default async function FinalCta() {
  const t = await getTranslations("landing.finalCta");

  return (
    <section aria-labelledby="final-title" className="bg-navy px-5 py-16 text-white sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="final-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h2>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/registro" className={ctaPrimary}>
            {t("cta")}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          <WhatsAppButton />
        </div>
      </div>
    </section>
  );
}
