import { getTranslations } from "next-intl/server";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { inner, sectionPad, sectionTitle } from "./styles";

const QUESTIONS = ["who", "feed", "buyers", "leave"] as const;

/** FAQ (shadcn Accordion) + FAQPage JSON-LD built from the same texts. */
export default async function DevFaq() {
  const t = await getTranslations("developersLanding.faq");
  const items = QUESTIONS.map((k) => ({ k, q: t(`items.${k}.q`), a: t(`items.${k}.a`) }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <section aria-labelledby="dev-faq-title" className={`bg-white ${sectionPad}`}>
      <div className={`${inner} max-w-3xl`}>
        <h2 id="dev-faq-title" className={sectionTitle}>
          {t("title")}
        </h2>
        <Accordion className="mt-8 border-y border-dev-border">
          {items.map(({ k, q, a }) => (
            <AccordionItem key={k} value={k} className="border-dev-border">
              <AccordionTrigger className="min-h-14 items-center py-4 text-base font-semibold text-dev-ink hover:no-underline">{q}</AccordionTrigger>
              <AccordionContent className="pb-5 pr-8 text-[15px] leading-7 text-dev-muted">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </section>
  );
}
