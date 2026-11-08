"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { buttonVariants } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/panel/PageHeader";
import type { Feed } from "@/lib/schemas/feed";
import type { Property } from "@/lib/schemas/property";
import type { PropertyStatsSummary } from "@/types/property-events";
import PropertiesTab from "./list/PropertiesTab";
import FeedsTab from "./feeds/FeedsTab";
import { StoreProvider, useFeeds, useProperties } from "./store";

export type Tab = "properties" | "feeds";

type Props = {
  initialProperties: Property[];
  initialFeeds: Feed[];
  /** Views and WhatsApp clicks per property id (read-only, loaded with the page). */
  stats: PropertyStatsSummary;
  initialTab?: Tab;
  initialAddFeed?: boolean;
};

/** The data loaded on the server goes into the store; everything below reads it from there. */
export default function PropertiesPage({ initialProperties, initialFeeds, stats, initialTab = "properties", initialAddFeed = false }: Props) {
  return (
    <StoreProvider properties={initialProperties} feeds={initialFeeds}>
      <PropertiesPageContent stats={stats} initialTab={initialTab} initialAddFeed={initialAddFeed} />
    </StoreProvider>
  );
}

function PropertiesPageContent({ stats, initialTab, initialAddFeed }: { stats: PropertyStatsSummary; initialTab: Tab; initialAddFeed: boolean }) {
  const t = useTranslations("panel.properties");
  const [tab, setTab] = useState<Tab>(initialTab);
  const propertyCount = useProperties().length;
  const feedCount = useFeeds().length;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href={ROUTES.newProperty} className={buttonVariants()}>
            <Plus aria-hidden className="size-4" />
            {t("addProperty")}
          </Link>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="mb-6">
          <TabsTrigger value="properties">
            {t("tabs.properties")} <span className="text-muted-foreground tabular-nums">({propertyCount})</span>
          </TabsTrigger>
          <TabsTrigger value="feeds">
            {t("tabs.feeds")} <span className="text-muted-foreground tabular-nums">({feedCount})</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="properties">
         <PropertiesTab stats={stats} onOpenFeeds={() => setTab("feeds")} />
        </TabsContent>
        <TabsContent value="feeds">
          <FeedsTab initialAdding={initialAddFeed} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
