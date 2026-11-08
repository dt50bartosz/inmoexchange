"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
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

      <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "agency" : "agencies"}
      </p>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[1040px]">
          <TableHeader>
            <TableRow>
              <TableHead>Agency</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Feeds</TableHead>
              <TableHead className="text-right">On network</TableHead>
              <TableHead className="text-right">Views (30d)</TableHead>
              <TableHead className="text-right">WhatsApp (30d)</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  {agencies.length === 0 ? "No agencies yet." : "No agencies match."}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((a) => (
                <TableRow key={a.id}>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <Pagination page={current} pageCount={pageCount} onChange={setPage} />
      </div>
    </AdminPage>
  );
}
