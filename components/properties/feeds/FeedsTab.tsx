"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Rss } from "lucide-react";
import { Button } from "@/components/ui/Button";
import FeedCard from "./FeedCard";
import AddFeedDialog from "./AddFeedDialog";
import DeleteFeedDialog from "./DeleteFeedDialog";
import { useFeeds, useProperties } from "../store";
import type { Feed } from "@/lib/schemas/feed";

/** initialAdding: open "Add XML feed" straight away (sidebar shortcut). */
export default function FeedsTab({ initialAdding = false }: { initialAdding?: boolean }) {
  const t = useTranslations("panel.properties.feeds");
  const feeds = useFeeds();
  const properties = useProperties();
  const [adding, setAdding] = useState(initialAdding);
  const [deleting, setDeleting] = useState<Feed | null>(null);

  const countFor = (id: string) => properties.filter((p) => p.source.kind === "feed" && p.source.feedId === id).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("intro")}</p>
        {feeds.length > 0 && (
          <Button type="button" onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-4" />
            {t("add")}
          </Button>
        )}
      </div>

      {feeds.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <Rss aria-hidden className="size-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">{t("empty.title")}</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("empty.body")}</p>
          <Button type="button" className="mt-6" onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-4" />
            {t("add")}
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {feeds.map((feed) => (
            <FeedCard key={feed.id} feed={feed} onDelete={() => setDeleting(feed)} />
          ))}
        </ul>
      )}

      <AddFeedDialog open={adding} onOpenChange={setAdding} />
      <DeleteFeedDialog feed={deleting} propertyCount={deleting ? countFor(deleting.id) : 0} onClose={() => setDeleting(null)} />
    </div>
  );
}
