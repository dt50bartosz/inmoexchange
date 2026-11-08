"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Building2, Plus, Rss } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/lib/constants/routes";
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
import PropertiesToolbar, { EMPTY_FILTERS, type Filters } from "./PropertiesToolbar";
import PropertiesTable from "./PropertiesTable";
import type { PropertyStatsSummary } from "@/types/property-events";
import Pagination from "./Pagination";
import { deleteProperty, setPropertyHidden } from "@/app/[locale]/panel/mis-propiedades/server/actions";
import { removeProperty, upsertProperty, useFeeds, useProperties } from "../store";
import { usePropertyFormat } from "../usePropertyFormat";
import type { Property } from "@/lib/schemas/property";

const PAGE_SIZE = 10;

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function PropertiesTab({ stats, onOpenFeeds }: { stats: PropertyStatsSummary; onOpenFeeds: () => void }) {
  const t = useTranslations("panel.properties");
  const f = usePropertyFormat();
  const properties = useProperties();
  const feeds = useFeeds();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<Property | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = normalize(filters.query.trim());
    return properties.filter((p) => {
      if (filters.status === "hidden" ? !p.hidden : filters.status !== "all" && p.status !== filters.status) return false;
      if (filters.condition !== "all" && p.condition !== filters.condition) return false;
      if (filters.source === "manual" && p.source.kind !== "manual") return false;
      if (filters.source !== "all" && filters.source !== "manual" && !(p.source.kind === "feed" && p.source.feedId === filters.source))
        return false;
      if (q && !normalize(`${p.code} ${p.reference} ${p.town} ${p.province} ${f.title(p)}`).includes(q)) return false;
      return true;
    });
  }, [properties, filters, f]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const changeFilters = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };

  const toggleHidden = async (p: Property) => {
    try {
      const res = await setPropertyHidden(p.id, !p.hidden);
      if (!res.ok) throw new Error(res.error);
      upsertProperty(res.data);
      toast.success(p.hidden ? t("toasts.shown", { ref: p.code }) : t("toasts.hidden", { ref: p.code }));
    } catch {
      toast.error(t("toasts.actionFailed"));
    }
  };

  const confirmDelete = async (e: MouseEvent) => {
    e.preventDefault(); // keep the dialog open until the server answers
    if (!deleting) return;
    setBusy(true);
    try {
      const res = await deleteProperty(deleting.id);
      if (!res.ok) {
        toast.error(res.error === "from_feed" ? t("toasts.deleteFromFeed") : t("toasts.actionFailed"));
        return;
      }
      removeProperty(deleting.id);
      toast.success(t("toasts.deleted", { ref: deleting.code }));
      setDeleting(null);
    } catch {
      toast.error(t("toasts.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
        <Building2 aria-hidden className="size-8 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">{t("empty.title")}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("empty.body")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={ROUTES.newProperty} className={buttonVariants()}>
            <Plus aria-hidden className="size-4" />
            {t("addProperty")}
          </Link>
          <Button type="button" variant="outline" onClick={onOpenFeeds}>
            <Rss aria-hidden className="size-4" />
            {t("empty.connectFeed")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PropertiesToolbar filters={filters} onChange={changeFilters} feeds={feeds} />

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("list.count", { count: filtered.length })}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
          <p className="font-medium">{t("list.noMatches")}</p>
          {filtersActive && (
            <Button type="button" variant="link" onClick={() => changeFilters(EMPTY_FILTERS)}>
              {t("filters.clear")}
            </Button>
          )}
        </div>
      ) : (
        <PropertiesTable properties={visible} feeds={feeds} stats={stats} onDelete={setDeleting} onToggleHidden={toggleHidden} />
      )}

      <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && t("deleteDialog.body", { property: f.title(deleting), ref: deleting.code })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={busy}>
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
