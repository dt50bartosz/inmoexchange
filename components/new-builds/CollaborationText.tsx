import { getFormatter, getTranslations } from "next-intl/server";
import type { Collaboration } from "@/types/developers";

/** "3 % del precio" / "6.000 € por unidad", or "A consultar" when the developer hasn't set it. */
export default async function CollaborationText({ c }: { c: Collaboration }) {
  const t = await getTranslations("newBuilds.collaboration");
  const format = await getFormatter();
  if (c.value === null) return <>{t("ask")}</>;
  return (
    <>
      {c.type === "percent"
        ? t("percent", { value: format.number(c.value, { maximumFractionDigits: 2 }) })
        : t("fixed", { amount: format.number(c.value, { style: "currency", currency: c.currency, maximumFractionDigits: 0 }) })}
    </>
  );
}
