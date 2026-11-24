"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Upload } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SimpleSelect from "@/components/panel/SimpleSelect";
import Pagination from "@/components/properties/list/Pagination";
import LocalTime from "@/components/developers/LocalTime";
import { ADMIN_PAGE_SIZE, ADMIN_ROUTES } from "@/lib/constants/admin";
import { CLOSED_LEAD_STATUSES, LEAD_STATUSES } from "@/lib/schemas/developer-leads";
import type { DeveloperLead } from "@/types/developer-leads";
import AdminPage from "../ui/AdminPage";
import { LEAD_STATUS_LABELS, LeadStatusBadge, PhoneLink } from "./lead-ui";

type Row = DeveloperLead & { due: boolean };

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const digits = (s: string) => s.replace(/\D/g, "");

/** Quick filters: one at a time, like tabs. */
const QUICK = [
  { value: "all", label: "Everyone" },
  { value: "due", label: "Due today" },
  { value: "never", label: "Never called" },
] as const;
type Quick = (typeof QUICK)[number]["value"];

/** Rows arrive in call order (lib/server/admin/developer-leads.ts sortForCalling); filters keep that order. */
export default function DeveloperLeadsPage({ leads }: { leads: Row[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [area, setArea] = useState("all");
  const [quick, setQuick] = useState<Quick>("all");
  const [showClosed, setShowClosed] = useState(false);
  const [page, setPage] = useState(1);

  const areas = useMemo(() => [...new Set(leads.map((l) => l.area.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [leads]);
  const counts = useMemo(
    () => ({
      due: leads.filter((l) => l.due).length,
      never: leads.filter((l) => !l.lastCallAt && !CLOSED_LEAD_STATUSES.includes(l.status) && l.status !== "joined").length,
      closed: leads.filter((l) => CLOSED_LEAD_STATUSES.includes(l.status)).length,
    }),
    [leads]
  );

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    const qDigits = digits(query);
    return leads.filter((l) => {
      // Not interested / do not call: hidden unless switched on, or picked in the status filter
      if (!showClosed && status === "all" && CLOSED_LEAD_STATUSES.includes(l.status)) return false;
      if (status !== "all" && l.status !== status) return false;
      if (area !== "all" && l.area.trim() !== area) return false;
      if (quick === "due" && !l.due) return false;
      if (quick === "never" && l.lastCallAt) return false;
      if (q) {
        const inText = normalize(`${l.company} ${l.contactPerson} ${l.role} ${l.email} ${l.area}`).includes(q);
        const inPhones = qDigits.length >= 3 && l.phones.some((p) => digits(p.number).includes(qDigits));
        if (!inText && !inPhones) return false;
      }
      return true;
    });
  }, [leads, query, status, area, quick, showClosed]);

  const pageCount = Math.max(1, Math.ceil(rows.length / ADMIN_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * ADMIN_PAGE_SIZE, current * ADMIN_PAGE_SIZE);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <AdminPage
      title="Developer calls"
      description="Property developers to call and invite to Colabora MLS: who to call next, on which number, and every call made."
      actions={
        <>
          <Link href={ADMIN_ROUTES.importDeveloperLeads} className={buttonVariants({ variant: "outline" })}>
            <Upload aria-hidden className="size-4" />
            Import CSV
          </Link>
          <Link href={ADMIN_ROUTES.newDeveloperLead} className={buttonVariants()}>
            <Plus aria-hidden className="size-4" />
            Add developer
          </Link>
        </>
      }
    >
      <div role="tablist" aria-label="Quick filter" className="mb-4 flex flex-wrap gap-2">
        {QUICK.map((f) => {
          const n = f.value === "due" ? counts.due : f.value === "never" ? counts.never : null;
          const active = quick === f.value;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => reset(setQuick)(f.value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-foreground/30"
              }`}
            >
              {f.label}
              {n !== null && <span className={`ml-1.5 tabular-nums ${active ? "" : f.value === "due" && n > 0 ? "font-semibold text-warning" : "text-muted-foreground"}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => reset(setQuery)(e.target.value)} placeholder="Company, person, phone, email or area" aria-label="Search developers" className="pl-8" />
        </div>
        <SimpleSelect
          aria-label="Status"
          value={status}
          onChange={reset(setStatus)}
          options={[{ value: "all", label: "All statuses" }, ...LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))]}
        />
        <SimpleSelect aria-label="Area" value={area} onChange={reset(setArea)} options={[{ value: "all", label: "All areas" }, ...areas.map((a) => ({ value: a, label: a }))]} />
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <Switch checked={showClosed} onCheckedChange={(on) => reset(setShowClosed)(on)} />
          Show not interested / do not call ({counts.closed})
        </label>
      </div>

      <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "developer" : "developers"} · in call order
      </p>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Main phone</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last call</TableHead>
              <TableHead>Next call</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  {leads.length === 0 ? (
                    <>
                      No developers yet.{" "}
                      <Link href={ADMIN_ROUTES.newDeveloperLead} className="font-medium text-foreground underline">
                        Add one
                      </Link>{" "}
                      or{" "}
                      <Link href={ADMIN_ROUTES.importDeveloperLeads} className="font-medium text-foreground underline">
                        import a CSV
                      </Link>
                      .
                    </>
                  ) : (
                    "No developers match these filters."
                  )}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((l) => (
                <TableRow key={l.id} className={l.due ? "bg-warning/5" : undefined}>
                  <TableCell className="max-w-[240px]">
                    <Link href={ADMIN_ROUTES.developerLead(l.id)} className="block truncate font-medium hover:underline">
                      {l.company}
                    </Link>
                    {l.email && <span className="block truncate text-xs text-muted-foreground">{l.email}</span>}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="truncate">{l.contactPerson || "—"}</p>
                    {l.role && <p className="truncate text-xs text-muted-foreground">{l.role}</p>}
                  </TableCell>
                  <TableCell>{l.mainPhone ? <PhoneLink phone={l.mainPhone} /> : <span className="text-sm text-destructive">No number</span>}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-muted-foreground">{l.area || "—"}</TableCell>
                  <TableCell>
                    <LeadStatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <LocalTime iso={l.lastCallAt} mode="date" empty="Never" />
                  </TableCell>
                  <TableCell className={`whitespace-nowrap ${l.due ? "font-medium text-warning" : "text-muted-foreground"}`}>
                    <LocalTime iso={l.nextCallAt} mode="dateTime" />
                    {l.due && <span className="block text-xs">Due</span>}
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
    </AdminPage>
  );
}
