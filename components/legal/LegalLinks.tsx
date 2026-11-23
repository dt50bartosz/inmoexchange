import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LEGAL_DOCS, type LegalDocKey } from "@/lib/constants/legal-docs";

/** Bottom of every legal page: the documents with a public page (lib/constants/legal-docs.ts, footer: true). */
export default async function LegalLinks() {
  const tl = await getTranslations("legal");
  const keys = (Object.keys(LEGAL_DOCS) as LegalDocKey[]).filter((k) => LEGAL_DOCS[k].footer);
  return (
    <nav aria-label={tl("related")} className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t pt-6 text-sm">
      {keys.map((k) => (
        <Link key={k} href={LEGAL_DOCS[k].path} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {tl(`docs.${k}`)}
        </Link>
      ))}
    </nav>
  );
}
