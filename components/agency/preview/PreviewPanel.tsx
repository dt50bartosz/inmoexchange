"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MicrositePreview from "./MicrositePreview";
import PartnerCard from "./PartnerCard";
import type { AgencyFormValues } from "@/lib/schemas/agency";

export default function PreviewPanel({ agency }: { agency: AgencyFormValues }) {
  const t = useTranslations("panel.agency.preview");
  return (
    <Tabs defaultValue="client">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{t("title")}</p>
        <TabsList>
          <TabsTrigger value="client">{t("client")}</TabsTrigger>
          <TabsTrigger value="partner">{t("partner")}</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="client">
        <MicrositePreview agency={agency} />
      </TabsContent>
      <TabsContent value="partner">
        <PartnerCard agency={agency} />
      </TabsContent>
    </Tabs>
  );
}
