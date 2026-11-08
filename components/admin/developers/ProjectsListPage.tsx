"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SimpleSelect from "@/components/panel/SimpleSelect";
import Pagination from "@/components/properties/list/Pagination";
import { ADMIN_PAGE_SIZE, ADMIN_ROUTES } from "@/lib/constants/admin";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, STALE_DAYS } from "@/lib/constants/developers";
import type { ProjectRow } from "@/types/developers";
import AdminPage from "../ui/AdminPage";
import CrmTabs from "./CrmTabs";
import { FreshnessCell, FreshnessLegend, ProjectStatusBadge, priceRange } from "./crm-ui";

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type ProjectFilters = { q?: string; status?: string; developer?: string; stale?: string; updated?: string; location?: string };

type Props = { projects: ProjectRow[]; initial: ProjectFilters };

const UPDATE_FILTERS = [
  { value: "all", label: "Any last update" },
  { value: "recent", label: `Updated in the last ${STALE_DAYS.warning} days` },
  { value: "30", label: "Not updated for 30+ days" },
  { value: "60", label: "Not updated for 60+ days" },
  { value: "90", label: "Not updated for 90+ days" },
];

export default function ProjectsListPage({ projects, initial }: Props) {
  const [query, setQuery] = useState(initial.q ?? "");
  const [status, setStatus] = useState(initial.status ?? "all");
  const [developer, setDeveloper] = useState(initial.developer ?? "all");
  const [location, setLocation] = useState(initial.location ?? "all");
  const [updated, setUpdated] = useState(initial.stale ?? (initial.updated === "recent" ? "recent" : "all"));
  const [sort, setSort] = useState<"oldest" | "newest" | "name">("newest");
  const [page, setPage] = useState(1);

  const developers = useMemo(() => [...new Map(projects.map((p) => [p.developerId, p.developerName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [projects]);
  const locations = useMemo(() => [...new Set(projects.flatMap((p) => [p.town, p.province]).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [projects]);

  const rows = useMemo(() => {
    const q = normalize(query.trim());
    const out = projects.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (developer !== "all" && p.developerId !== developer) return false;
      if (location !== "all" && p.town !== location && p.province !== location) return false;
      if (updated === "recent" && p.daysSinceUpdate >= STALE_DAYS.warning) return false;
      if (["30", "60", "90"].includes(updated) && p.daysSinceUpdate < Number(updated)) return false;
      if (q && !normalize(`${p.name} ${p.developerName} ${p.town} ${p.province}`).includes(q)) return false;
      return true;
    });
    if (sort === "name") return out.sort((a, b) => a.name.localeCompare(b.name));
    // listProjects() already sorts newest update first
    return sort === "oldest" ? [...out].reverse() : out;
  }, [projects, query, status, developer, location, updated, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / ADMIN_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * ADMIN_PAGE_SIZE, current * ADMIN_PAGE_SIZE);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  return (
    <AdminPage
      title="Developer CRM"
      description="Every development project, with when it was last updated."
      actions={
        <Link href={ADMIN_ROUTES.pickDeveloperForProject} className={buttonVariants()}>
          <Plus aria-hidden className="size-4" />
          New development
        </Link>
      }
    >
      <CrmTabs />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => reset(setQuery)(e.target.value)} placeholder="Project or developer" aria-label="Search projects" className="pl-8" />
        </div>
        <SimpleSelect aria-label="Status" value={status} onChange={reset(setStatus)} options={[{ value: "all", label: "All statuses" }, ...PROJECT_STATUSES.map((s) => ({ value: s, label: PROJECT_STATUS_LABELS[s] }))]} />
        <SimpleSelect aria-label="Developer" value={developer} onChange={reset(setDeveloper)} options={[{ value: "all", label: "All developers" }, ...developers.map(([id, name]) => ({ value: id, label: name }))]} />
        <SimpleSelect aria-label="Location" value={location} onChange={reset(setLocation)} options={[{ value: "all", label: "All locations" }, ...locations.map((l) => ({ value: l, label: l }))]} />
        <SimpleSelect aria-label="Last update" value={updated} onChange={reset(setUpdated)} options={UPDATE_FILTERS} />
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {rows.length} {rows.length === 1 ? "project" : "projects"}
        </p>
        <SimpleSelect
          aria-label="Sort"
          value={sort}
          onChange={(v) => setSort(v as typeof sort)}
          className="w-64"
          options={[
            { value: "newest", label: "Most recently updated first" },
            { value: "oldest", label: "Longest without update first" },
            { value: "name", label: "Name (A–Z)" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Developer</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Last update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  {projects.length === 0 ? "No projects yet. Open a developer to add one." : "No projects match these filters."}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-[240px]">
                    <div className="flex items-center gap-3">
                      {p.mainImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.mainImageUrl} alt="" className="size-9 shrink-0 rounded object-cover" />
                      ) : (
                        <span aria-hidden className="size-9 shrink-0 rounded bg-muted" />
                      )}
                      <Link href={ADMIN_ROUTES.project(p.developerId, p.id)} className="truncate font-medium hover:underline">
                        {p.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[180px]">
                    <Link href={ADMIN_ROUTES.developer(p.developerId)} className="block truncate hover:underline">
                      {p.developerName}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-muted-foreground">{[p.town, p.province].filter(Boolean).join(", ")}</TableCell>
                  <TableCell>
                    <ProjectStatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.unitsTotal ?? "—"}
                    {p.unitsAvailable !== null && <span className="block text-xs text-muted-foreground">{p.unitsAvailable} available</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{priceRange(p.priceFrom, p.priceTo, p.currency) || "—"}</TableCell>
                  <TableCell>
                    <FreshnessCell iso={p.lastUpdateAt} days={p.daysSinceUpdate} freshness={p.freshness} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <FreshnessLegend />
        <Pagination page={current} pageCount={pageCount} onChange={setPage} />
      </div>
    </AdminPage>
  );
}
