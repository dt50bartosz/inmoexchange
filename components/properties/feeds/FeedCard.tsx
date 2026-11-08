"use client";

import { useState } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { AlertTriangle, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { setFeedPaused, syncFeed } from "@/app/[locale]/panel/mis-propiedades/server/actions";
import { upsertFeed } from "../store";
import type { Feed, FeedStatus } from "@/lib/schemas/feed";

const STATUS_CLASS: Record<FeedStatus, string> = {
  active: "bg-success-soft text-success",
  syncing: "bg-primary/10 text-primary",
  paused: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive",
};

type Props = { feed: Feed; onDelete: () => void };

export default function FeedCard({ feed, onDelete }: Props) {
  const t = useTranslations("panel.properties.feeds");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [busy, setBusy] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const syncing = syncingNow || feed.status === "syncing";

  const syncNow = async () => {
    setSyncingNow(true);
    try {
      const res = await syncFeed(feed.id);
      if (!res.ok) {
        // The server saved the problem on the feed; show it here too
        if (res.error !== "not_found" && res.error !== "paused") upsertFeed({ ...feed, status: "error", lastError: res.error });
        toast.error(t("toasts.syncFailed", { name: feed.name }));
        return;
      }
      upsertFeed(res.data.feed);
      toast.success(t("toasts.synced", { name: feed.name, count: res.data.feed.propertyCount }));
    } catch {
      toast.error(t("toasts.syncFailed", { name: feed.name }));
    } finally {
      setSyncingNow(false);
    }
  };

  const togglePause = async () => {
    const pausing = feed.status !== "paused";
    setBusy(true);
    try {
      const res = await setFeedPaused(feed.id, pausing);
      if (!res.ok) throw new Error(res.error);
      upsertFeed(res.data);
      toast.success(pausing ? t("toasts.paused", { name: feed.name }) : t("toasts.resumed", { name: feed.name }));
    } catch {
      toast.error(t("toasts.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{feed.name}</h3>
            <Badge variant="secondary" className={STATUS_CLASS[feed.status]}>
              {t(`statuses.${feed.status}`)}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground" title={feed.url}>
            {feed.url}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={syncNow} disabled={busy || syncing || feed.status === "paused"}>
            <RefreshCw aria-hidden className={`size-4 ${syncing ? "animate-spin motion-reduce:animate-none" : ""}`} />
            {syncing ? t("syncing") : t("syncNow")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={togglePause} disabled={busy || syncing}>
            {feed.status === "paused" ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
            {feed.status === "paused" ? t("resume") : t("pause")}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onDelete} disabled={busy || syncing}>
            <Trash2 aria-hidden className="size-4" />
            {t("delete")}
          </Button>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t("lastSync")}</dt>
          <dd>{feed.lastSyncAt ? format.relativeTime(new Date(feed.lastSyncAt), now) : t("never")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("properties")}</dt>
          <dd className="tabular-nums">{feed.propertyCount}</dd>
        </div>
      </dl>

      {feed.status === "error" && feed.lastError && (
        <p className="mt-4 flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {t("errorPrefix")} {t.has(`errors.${feed.lastError}`) ? t(`errors.${feed.lastError}`) : feed.lastError}
          </span>
        </p>
      )}
    </li>
  );
}
