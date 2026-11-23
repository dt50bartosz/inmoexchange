"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { deleteAgenciesAction } from "@/app/[locale]/admin/agencies/[id]/server/actions";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SimpleSelect from "@/components/panel/SimpleSelect";
import Pagination from "@/components/properties/list/Pagination";
import { ADMIN_PAGE_SIZE, ADMIN_ROUTES } from "@/lib/constants/admin";
import { REGION_KEYS, type RegionKey } from "@/lib/constants/options";
import type { AdminAgency } from "@/types/admin";
import type { PropertyStatsSummary } from "@/types/property-events";
import StatCell from "@/components/properties/list/StatCell";
import AdminPage from "../ui/AdminPage";
import AgencyStatusBadge from "../ui/AgencyStatusBadge";
import { useAdminFormat } from "../ui/useAdminFormat";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
  { value: "invite", label: "Not logged in yet" },
];

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Props = {
  agencies: AdminAgency[];
  /** Feeds per agency id. */
  feedCounts: Record<string, number>;
  /** Properties on the network per agency id (active, not hidden by the agency or the admin). */
  propertyCounts: Record<string, number>;
  /** Views and WhatsApp clicks of each agency's properties, per agency id (read-only). */
  stats: PropertyStatsSummary;
};

export default function AgenciesPage({ agencies, feedCounts, propertyCounts, stats }: Props) {
  const to = useTranslations("panel.options");
  const f = useAdminFormat();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [area, setArea] = useState("all");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Ids waiting for confirmation: one row's trash icon, or "Delete selected". */
  const [toDelete, setToDelete] = useState<string[] | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, startTransition] = useTransition();

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    // listAgencies() already sorts newest first
    return agencies.filter((a) => {
      if (status === "invite" ? !a.invitePending : status !== "all" && a.status !== status) return false;
      if (area !== "all" && !a.regions.includes(area as RegionKey)) return false;
      if (q && !normalize(`${a.name} ${a.legalName} ${a.cif} ${a.contactPerson} ${a.email} ${a.town}`).includes(q)) return false;
      return true;
    });
  }, [agencies, query, status, area]);

  const pageCount = Math.max(1, Math.ceil(rows.length / ADMIN_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * ADMIN_PAGE_SIZE, current * ADMIN_PAGE_SIZE);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  // Selection only counts agencies still in the list (a deleted one drops out after the refresh)
  const selectedIds = agencies.filter((a) => selected.has(a.id)).map((a) => a.id);
  const allMatchingSelected = rows.length > 0 && rows.every((a) => selected.has(a.id));
  const someMatchingSelected = rows.some((a) => selected.has(a.id));
  const toggleAll = (on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      for (const a of rows) {
        if (on) next.add(a.id);
        else next.delete(a.id);
      }
      return next;
    });
  const toggleOne = (id: string, on: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const askDelete = (ids: string[]) => {
    setTyped("");
    setToDelete(ids);
  };
  const deleteCount = toDelete?.length ?? 0;
  const single = toDelete && toDelete.length === 1 ? agencies.find((a) => a.id === toDelete[0]) : undefined;
  const needsTyping = deleteCount > 1;

  const remove = () => {
    const ids = toDelete ?? [];
    setToDelete(null);
    startTransition(async () => {
      const res = await deleteAgenciesAction(ids).catch(() => null);
      if (!res?.ok) {
        toast.error("Couldn't delete. Try again.");
        return;
      }
      const { deleted, cancelled, missing } = res.data;
      const parts = [
        deleted && `${deleted} deleted`,
        cancelled && `${cancelled} developer${cancelled === 1 ? "" : "s"} cancelled instead (agencies registered clients with them)`,
        missing && `${missing} no longer existed`,
      ].filter(Boolean);
      toast.success(parts.join(" · ") || "Nothing to delete.");
      setSelected((s) => {
        const next = new Set(s);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      router.refresh();
    });
  };

  return (
    <AdminPage
      title="Agencies"
      description="Every agency on the network. Open one to see its feeds and properties, or to suspend it."
      actions={
        <Link href={ADMIN_ROUTES.newAgency} className={buttonVariants()}>
          <Plus aria-hidden className="size-4" />
          Add agency
        </Link>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => reset(setQuery)(e.target.value)} placeholder="Name, CIF, email or town" aria-label="Search agencies" className="pl-8" />
        </div>
        <SimpleSelect aria-label="Status" value={status} onChange={reset(setStatus)} options={STATUS_FILTERS} />
        <SimpleSelect
          aria-label="Area"
          value={area}
          onChange={reset(setArea)}
          options={[{ value: "all", label: "All areas" }, ...REGION_KEYS.map((r) => ({ value: r, label: to(`regions.${r}`) }))]}
        />
      </div>

      <div className="mb-2 flex min-h-9 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {rows.length} {rows.length === 1 ? "agency" : "agencies"}
          {selectedIds.length > 0 && <span className="font-medium text-foreground"> · {selectedIds.length} selected</span>}
        </p>
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {!allMatchingSelected && rows.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => toggleAll(true)}>
                Select all {rows.length} matching
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X aria-hidden className="size-4" />
              Clear
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => askDelete(selectedIds)}>
              <Trash2 aria-hidden className="size-4" />
              Delete selected ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[1120px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allMatchingSelected}
                  indeterminate={!allMatchingSelected && someMatchingSelected}
                  onCheckedChange={(on) => toggleAll(!!on)}
                  aria-label={`Select all ${rows.length} matching agencies`}
                  disabled={rows.length === 0}
                />
              </TableHead>
              <TableHead>Agency</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Feeds</TableHead>
              <TableHead className="text-right">On network</TableHead>
              <TableHead className="text-right">Views (30d)</TableHead>
              <TableHead className="text-right">WhatsApp (30d)</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                  {agencies.length === 0 ? "No agencies yet." : "No agencies match."}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((a) => (
                <TableRow key={a.id} data-state={selected.has(a.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={selected.has(a.id)} onCheckedChange={(on) => toggleOne(a.id, !!on)} aria-label={`Select ${a.name}`} />
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <Link href={ADMIN_ROUTES.agency(a.id)} className="block truncate font-medium hover:underline">
                      {a.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {[a.town, a.cif].filter(Boolean).join(" · ")}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <p className="truncate">{a.contactPerson}</p>
                    <p className="truncate text-xs text-muted-foreground" title={a.email}>
                      {a.email}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <AgencyStatusBadge status={a.status} />
                      {a.invitePending && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Not logged in yet
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{feedCounts[a.id] ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {propertyCounts[a.id] ? (
                      <Link href={{ pathname: ADMIN_ROUTES.properties, query: { agency: a.id } }} className="hover:underline">
                        {propertyCounts[a.id]}
                      </Link>
                    ) : (
                      0
                    )}
                  </TableCell>
                  <StatCell recent={stats[a.id]?.views30 ?? 0} totalText={`${stats[a.id]?.views ?? 0} total`} recentLabel="in the last 30 days" />
                  <StatCell recent={stats[a.id]?.whatsapp30 ?? 0} totalText={`${stats[a.id]?.whatsapp ?? 0} total`} recentLabel="in the last 30 days" />
                  <TableCell className="whitespace-nowrap text-muted-foreground">{f.date(a.createdAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{a.lastLoginAt ? f.date(a.lastLoginAt) : "Never"}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => askDelete([a.id])} aria-label={`Delete ${a.name}`} title="Delete">
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <Pagination page={current} pageCount={pageCount} onChange={setPage} />
      </div>

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{single ? `Delete ${single.name}?` : `Delete ${deleteCount} agencies?`}</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {single ? "the agency" : "each agency"}, its login, properties, feeds, CRM and client microsites. It can&apos;t be undone.
              Developer accounts with client registrations by agencies are cancelled instead of deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {needsTyping && (
            <div className="grid gap-1.5">
              <label htmlFor="confirm-delete" className="text-sm">
                Type <span className="font-mono font-semibold">DELETE</span> to confirm
              </label>
              <Input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={needsTyping && typed !== "DELETE"} onClick={remove}>
              {single ? "Delete agency" : `Delete ${deleteCount} agencies`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPage>
  );
}
