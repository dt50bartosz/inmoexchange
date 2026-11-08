"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { ADMIN_ROUTES, FEED_ERROR_TEXT } from "@/lib/constants/admin";
import type { FeedStatus } from "@/lib/schemas/feed";
import type { AdminAgency, AdminFeed } from "@/types/admin";
import { adminSyncFeedAction } from "@/app/[locale]/admin/feeds/server/actions";
import AdminPage from "../ui/AdminPage";
import { useAdminFormat } from "../ui/useAdminFormat";

const STATUS_CLASS: Record<FeedStatus, string> = {
  active: "bg-success-soft text-success",
  syncing: "bg-primary/10 text-primary",
  paused: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive",
};

const agencyName = (agencies: AdminAgency[], id: string) => agencies.find((a) => a.id === id)?.name ?? "Deleted agency";

type Props = { agencies: AdminAgency[]; initialFeeds: AdminFeed[] };

export default function AdminFeedsPage({ agencies, initialFeeds }: Props) {
  const f = useAdminFormat();
  const [feeds, setFeeds] = useState(initialFeeds);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const rows = feeds
    .filter((x) => status === "all" || x.status === status)
    .sort((a, b) => Number(b.status === "error") - Number(a.status === "error") || (a.lastSyncAt ?? "").localeCompare(b.lastSyncAt ?? ""));

  const sync = async (id: string, name: string) => {
    setSyncingId(id);
    try {
      const res = await adminSyncFeedAction(id);
      if (!res.ok) throw new Error(res.error);
      setFeeds((list) => list.map((x) => (x.id === id ? res.data.feed : x)));
      if (res.data.synced) toast.success(`${name} synced.`);
      else toast.error(`${name} still fails. Contact the agency about their feed.`);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <AdminPage title="XML feeds" description="Every agency's import feed. Broken feeds are listed first.">
      <div className="mb-4 flex">
        <SimpleSelect
          aria-label="Status"
          value={status}
          onChange={setStatus}
          className="w-full sm:w-48"
          options={[
            { value: "all", label: "All feeds" },
            { value: "error", label: "With errors" },
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead>Feed</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sync</TableHead>
              <TableHead className="text-right">Properties</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No feeds match.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate font-medium">{x.name}</p>
                    <p className="truncate text-xs text-muted-foreground" title={x.url}>
                      Kyero · {x.url}
                    </p>
                    {x.status === "error" && x.lastError && (
                      <p className="mt-1 flex gap-1 text-xs text-destructive">
                        <AlertTriangle aria-hidden className="mt-px size-3.5 shrink-0" />
                        {FEED_ERROR_TEXT[x.lastError] ?? x.lastError}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={ADMIN_ROUTES.agency(x.agencyId)} className="hover:underline">
                      {agencyName(agencies, x.agencyId)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_CLASS[x.status]}>
                      {x.status[0].toUpperCase() + x.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{x.lastSyncAt ? f.dateTime(x.lastSyncAt) : "Never"}</TableCell>
                  <TableCell className="text-right tabular-nums">{x.propertyCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={syncingId !== null || x.status === "syncing" || x.status === "paused"}
                      onClick={() => sync(x.id, x.name)}
                    >
                      <RefreshCw aria-hidden className={`size-4 ${syncingId === x.id || x.status === "syncing" ? "animate-spin motion-reduce:animate-none" : ""}`} />
                      {syncingId === x.id || x.status === "syncing" ? "Syncing…" : "Sync now"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AdminPage>
  );
}
