"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PropertyStatsSummary } from "@/types/property-events";
import StatCell from "@/components/properties/list/StatCell";
import SimpleSelect from "@/components/panel/SimpleSelect";
import Pagination from "@/components/properties/list/Pagination";
import { usePropertyFormat } from "@/components/properties/usePropertyFormat";
import { ADMIN_PAGE_SIZE, ADMIN_ROUTES } from "@/lib/constants/admin";
import { REGION_KEYS } from "@/lib/constants/options";
import type { AdminAgency, AdminProperty } from "@/types/admin";
import AdminPage from "../ui/AdminPage";
import HideDialog from "./HideDialog";
import { unhidePropertyAction } from "@/app/[locale]/admin/properties/server/actions";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "network", label: "On the network" },
  { value: "admin", label: "Hidden by admin" },
  { value: "agency", label: "Hidden or private (agency)" },
  { value: "sold", label: "Sold" },
];

const agencyName = (agencies: AdminAgency[], id: string) => agencies.find((a) => a.id === id)?.name ?? "Deleted agency";

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const onNetwork = (p: AdminProperty) => p.status === "active" && p.shared && !p.hidden && !p.moderation;

/** `stats`: views and WhatsApp clicks per property id (read-only). */
type Props = { agencies: AdminAgency[]; initialProperties: AdminProperty[]; stats: PropertyStatsSummary };

export default function AdminPropertiesPage({ agencies, initialProperties, stats }: Props) {
  const to = useTranslations("panel.options");
  const fp = usePropertyFormat();
  const params = useSearchParams();
  const [properties, setProperties] = useState(initialProperties);
  const [busyId, setBusyId] = useState<string | null>(null);

  /** Puts the server's version of a property into the list. */
  const replace = (updated: AdminProperty) => setProperties((list) => list.map((p) => (p.id === updated.id ? updated : p)));

  const unhide = async (p: AdminProperty) => {
    setBusyId(p.id);
    try {
      const res = await unhidePropertyAction(p.id);
      if (!res.ok) throw new Error(res.error);
      replace(res.data);
      toast.success(`${p.code} is back on the network.`);
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const [query, setQuery] = useState("");
  const [agency, setAgency] = useState(params.get("agency") ?? "all");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState("all");
  const [condition, setCondition] = useState("all");
  const [page, setPage] = useState(1);
  const [hiding, setHiding] = useState<AdminProperty | null>(null);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    return properties
      .filter((p) => {
        if (agency !== "all" && p.agencyId !== agency) return false;
        if (area !== "all" && p.area !== area) return false;
        if (condition !== "all" && p.condition !== condition) return false;
        if (status === "network" && !onNetwork(p)) return false;
        if (status === "admin" && !p.moderation) return false;
        if (status === "agency" && !(p.hidden || !p.shared)) return false;
        if (status === "sold" && p.status !== "sold") return false;
        if (q && !normalize(`${p.code} ${p.reference} ${p.town} ${p.province}`).includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [properties, query, agency, area, status, condition]);

  const pageCount = Math.max(1, Math.ceil(rows.length / ADMIN_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * ADMIN_PAGE_SIZE, current * ADMIN_PAGE_SIZE);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <AdminPage title="Properties" description="Every property on the platform. Hide listings that break the rules; the agency sees your reason.">
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => reset(setQuery)(e.target.value)} placeholder="Reference or town" aria-label="Search properties" className="pl-8" />
        </div>
        <SimpleSelect
          aria-label="Agency"
          value={agency}
          onChange={reset(setAgency)}
          options={[{ value: "all", label: "All agencies" }, ...agencies.map((a) => ({ value: a.id, label: a.name }))]}
        />
        <SimpleSelect
          aria-label="Area"
          value={area}
          onChange={reset(setArea)}
          options={[{ value: "all", label: "All areas" }, ...REGION_KEYS.map((r) => ({ value: r, label: to(`regions.${r}`) }))]}
        />
        <SimpleSelect
          aria-label="New build or resale"
          value={condition}
          onChange={reset(setCondition)}
          options={[
            { value: "all", label: "New build and resale" },
            { value: "newBuild", label: "New build" },
            { value: "resale", label: "Resale" },
          ]}
        />
        <SimpleSelect aria-label="Status" value={status} onChange={reset(setStatus)} options={STATUS_FILTERS} />
      </div>

      <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "property" : "properties"}
      </p>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[1040px]">
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Agency</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Views (30d)</TableHead>
              <TableHead className="text-right">WhatsApp (30d)</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No properties match.
                </TableCell>
              </TableRow>
            ) : (
              visible.map((p) => (
                <TableRow key={p.id} className={p.moderation ? "bg-destructive/5" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-muted">
                        {p.photos[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.photos[0].url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{fp.title(p)}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{p.code}</span> · agency ref {p.reference} · {p.source.kind === "feed" ? "XML feed" : "Manual"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={ADMIN_ROUTES.agency(p.agencyId)} className="hover:underline">
                      {agencyName(agencies, p.agencyId)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fp.price(p.price)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.condition === "newBuild" && <Badge variant="secondary" className="bg-info-soft text-info">New build</Badge>}
                      {p.moderation ? (
                        <Badge variant="secondary" className="bg-destructive/10 text-destructive" title={p.moderation.reason}>
                          Hidden by admin
                        </Badge>
                      ) : onNetwork(p) ? (
                        <Badge variant="secondary" className="bg-success-soft text-success">On network</Badge>
                      ) : p.status === "sold" ? (
                        <Badge variant="secondary">Sold</Badge>
                      ) : (
                        <Badge variant="outline">{p.hidden ? "Hidden by agency" : "Not shared"}</Badge>
                      )}
                    </div>
                    {p.moderation && <p className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">{p.moderation.reason}</p>}
                  </TableCell>
                  <StatCell recent={stats[p.id]?.views30 ?? 0} totalText={`${stats[p.id]?.views ?? 0} total`} recentLabel="in the last 30 days" />
                  <StatCell recent={stats[p.id]?.whatsapp30 ?? 0} totalText={`${stats[p.id]?.whatsapp ?? 0} total`} recentLabel="in the last 30 days" />
                  <TableCell className="text-right">
                    {p.moderation ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busyId === p.id}
                        onClick={() => unhide(p)}
                      >
                        <Eye aria-hidden className="size-4" />
                        Unhide
                      </Button>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setHiding(p)}>
                        <EyeOff aria-hidden className="size-4" />
                        Hide
                      </Button>
                    )}
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

      <HideDialog
        property={hiding}
        agencyName={hiding ? agencyName(agencies, hiding.agencyId) : ""}
        onHidden={replace}
        onClose={() => setHiding(null)}
      />
    </AdminPage>
  );
}
