"use client";

import { useState, type MouseEvent } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Copy, ExternalLink, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ROUTES } from "@/lib/constants/routes";
import { feedUrl } from "@/lib/constants/xmlExport";
import {
  deleteXmlExport,
  regenerateXmlExportToken,
  type XmlExportListItem,
} from "@/app/[locale]/panel/exportar-xml/server/actions";
import FilterSummary from "./FilterSummary";
import { removeXmlExport, upsertXmlExport } from "./store";

type Confirm = null | "regenerate" | "delete";

export default function ExportCard({ item }: { item: XmlExportListItem }) {
  const t = useTranslations("panel.xmlExport");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const { mine, partners } = item.counts;
  const total = mine + partners;
  const url = feedUrl(item.token);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("toasts.copied"));
    } catch {
      toast.error(t("toasts.copyFailed"));
    }
  };

  const doConfirm = async (e: MouseEvent) => {
    e.preventDefault(); // keep the dialog open until the server answers
    setBusy(true);
    try {
      if (confirm === "regenerate") {
        const res = await regenerateXmlExportToken(item.id);
        if (!res.ok) throw new Error(res.error);
        upsertXmlExport(res.data);
        toast.success(t("toasts.regenerated", { name: item.name }));
      } else if (confirm === "delete") {
        const res = await deleteXmlExport(item.id);
        if (!res.ok) throw new Error(res.error);
        removeXmlExport(item.id);
        toast.success(t("toasts.deleted", { name: item.name }));
      }
      setConfirm(null);
    } catch {
      toast.error(t("toasts.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{item.name}</h2>
            <Badge variant="outline">Kyero v3</Badge>
          </div>
          <FilterSummary filters={item.filters} />
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold tabular-nums">{t("card.count", { count: total })}</p>
          <p className="text-muted-foreground">{t("card.split", { mine, partners })}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-2">
        <code className="min-w-0 flex-1 truncate px-1 text-sm" title={url}>
          {url}
        </code>
        <Button type="button" size="sm" onClick={copy}>
          <Copy aria-hidden className="size-4" />
          {t("card.copy")}
        </Button>
        <a href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ExternalLink aria-hidden className="size-4" />
          {t("card.open")}
        </a>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {item.lastFetchedAt ? t("card.lastFetched", { when: format.relativeTime(new Date(item.lastFetchedAt), now) }) : t("card.neverFetched")}
        </p>
        <div className="flex flex-wrap gap-1">
          <Link href={ROUTES.editXmlExport(item.id)} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Pencil aria-hidden className="size-4" />
            {t("card.edit")}
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirm("regenerate")}>
            <RefreshCw aria-hidden className="size-4" />
            {t("card.regenerate")}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirm("delete")}>
            <Trash2 aria-hidden className="size-4" />
            {t("card.delete")}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "delete" ? t("deleteDialog.title", { name: item.name }) : t("regenerateDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{confirm === "delete" ? t("deleteDialog.body") : t("regenerateDialog.body")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={doConfirm} disabled={busy}>
              {confirm === "delete" ? t("deleteDialog.confirm") : t("regenerateDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}