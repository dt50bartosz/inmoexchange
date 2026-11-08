"use client";

import { useTranslations } from "next-intl";
import { FileCode2, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import PageHeader from "@/components/panel/PageHeader";
import { ROUTES } from "@/lib/constants/routes";
import type { XmlExportListItem } from "@/app/[locale]/panel/exportar-xml/server/actions";
import ExportCard from "./ExportCard";
import { StoreProvider, useXmlExports } from "./store";

/** The links loaded on the server go into the store; everything below reads them from there. */
export default function ExportsPage({ initialItems }: { initialItems: XmlExportListItem[] }) {
  return (
    <StoreProvider items={initialItems}>
      <ExportsPageContent />
    </StoreProvider>
  );
}

function ExportsPageContent() {
  const t = useTranslations("panel.xmlExport");
  const items = useXmlExports();

  const createButton = (
    <Link href={ROUTES.newXmlExport} className={buttonVariants()}>
      <Plus aria-hidden className="size-4" />
      {t("create")}
    </Link>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <PageHeader title={t("title")} description={t("description")} actions={items.length > 0 ? createButton : undefined} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <FileCode2 aria-hidden className="size-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">{t("empty.title")}</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("empty.body")}</p>
          <div className="mt-6">{createButton}</div>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <ExportCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
