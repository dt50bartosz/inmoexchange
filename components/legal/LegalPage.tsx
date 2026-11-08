import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Layout";
import { LEGAL, LEGAL_IS_EXAMPLE } from "@/lib/constants/legal";

/** Values the texts can use: {company}, {cif}, {address}, {registry}, {email}, {courts}, {hosting}, {emailProvider}. */
const VALUES = { ...LEGAL, registry: LEGAL.registry || "—" };

/** Title, description, hreflang es/en/pl (x-default es); not indexed while the company details are examples. */
export function legalMetadata(locale: string, path: string, title: string, description: string): Metadata {
  const at = (l: string) => (l === "es" ? path : `/${l}${path}`);
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  return {
    ...(base ? { metadataBase: new URL(base) } : {}),
    title,
    description,
    alternates: { canonical: at(locale), languages: { es: at("es"), en: at("en"), pl: at("pl"), "x-default": at("es") } },
    ...(LEGAL_IS_EXAMPLE ? { robots: { index: false, follow: true } } : {}),
  };
}

type Props = {
  /** "legal.privacy", "legal.terms" or "legal.notice": title, intro and sections.<key>.title / .body */
  namespace: "legal.privacy" | "legal.terms" | "legal.notice";
  sections: readonly string[];
};

/**
 * Shared layout of the legal pages (same look as /cookies). Section bodies are plain text from the message files:
 * blocks separated by a blank line; a block whose lines all start with "- " becomes a list.
 */
export default async function LegalPage({ namespace, sections }: Props) {
  const t = await getTranslations(namespace);
  const tl = await getTranslations("legal");
  const format = await getFormatter();
  const locale = await getLocale();

  const blocks = (body: string) =>
    body.split(/\n\s*\n/).map((block, i) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      return lines.every((l) => l.startsWith("- ")) ? (
        <ul key={i} className="list-disc space-y-1.5 pl-5">
          {lines.map((l, j) => (
            <li key={j}>{l.slice(2)}</li>
          ))}
        </ul>
      ) : (
        <p key={i}>{lines.join(" ")}</p>
      );
    });

  return (
    // Top padding clears the navbar, which sits over the page
    <Container className="max-w-3xl pb-16 pt-14">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{tl("updated", { date: format.dateTime(new Date(`${LEGAL.updated}T12:00:00Z`), { dateStyle: "long" }) })}</p>

      {LEGAL_IS_EXAMPLE && (
        <p role="note" className="mt-6 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          {tl("exampleBanner")}
        </p>
      )}
      {locale !== "es" && <p className="mt-4 text-sm text-muted-foreground">{tl("spanishBinding")}</p>}

      <div className="mt-8 space-y-8 leading-relaxed">
        <p>{t("intro", VALUES)}</p>
        {sections.map((k, i) => (
          <section key={k} className="space-y-3">
            <h2 className="text-xl font-semibold">
              {i + 1}. {t(`sections.${k}.title`)}
            </h2>
            {blocks(t(`sections.${k}.body`, VALUES))}
          </section>
        ))}
      </div>

      <nav aria-label={tl("related")} className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t pt-6 text-sm">
        {(
          [
            ["notice", "/aviso-legal"],
            ["privacy", "/privacidad"],
            ["terms", "/terminos"],
            ["cookies", "/cookies"],
          ] as const
        ).map(([key, href]) => (
          <Link key={key} href={href} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {tl(`links.${key}`)}
          </Link>
        ))}
      </nav>
    </Container>
  );
}
