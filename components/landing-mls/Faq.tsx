import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { eyebrow, sectionPad, sectionTitle } from "./styles";

const QUESTIONS = ["pay", "feed", "consent", "commission", "cancel", "developer"] as const;

/** Section 6: native <details> accordion (no client JS) + FAQPage JSON-LD built from the same texts. */
export default async function Faq() {
  const t = await getTranslations("landing.faq");
  const items = QUESTIONS.map((k) => ({ k, q: t(`items.${k}.q`), a: t(`items.${k}.a`) }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <section id="faq" aria-labelledby="faq-title" className={`scroll-mt-4 bg-white ${sectionPad}`}>
      <div className="mx-auto max-w-3xl">
        <p className={eyebrow}>{t("eyebrow")}</p>
        <h2 id="faq-title" className={sectionTitle}>
          {t("title")}
        </h2>

        <div className="mt-8 divide-y divide-navy/10 border-y border-navy/10">
          {items.map(({ k, q, a }) => (
            <details key={k} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-navy [&::-webkit-details-marker]:hidden">
                {q}
                <Plus aria-hidden className="size-5 shrink-0 text-terracotta transition-transform group-open:rotate-45 motion-reduce:transition-none" />
              </summary>
              <p className="pb-5 pr-9 leading-7 text-navy/75">
                {a}
                {/* Developers apply on their own page */}
                {k === "developer" && (
                  <>
                    {" "}
                    <Link href="/promotoras#solicitud" className="font-semibold text-terracotta underline underline-offset-4 hover:no-underline">
                      {t("items.developer.link")}
                    </Link>
                  </>
                )}
              </p>
            </details>
          ))}
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </section>
  );
}
