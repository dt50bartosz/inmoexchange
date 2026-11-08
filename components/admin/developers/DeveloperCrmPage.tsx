"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Mail, Pencil, Plus, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SimpleSelect from "@/components/panel/SimpleSelect";
import Pagination from "@/components/properties/list/Pagination";
import LocalTime from "@/components/developers/LocalTime";
import { ADMIN_PAGE_SIZE, ADMIN_ROUTES } from "@/lib/constants/admin";
import { DEVELOPER_STATUSES, STALE_DAYS, freshness } from "@/lib/constants/developers";
import type { Activity, DeveloperCrmStats, DeveloperRow } from "@/types/developers";
import AdminPage from "../ui/AdminPage";
import StatCard from "../ui/StatCard";
import CrmTabs from "./CrmTabs";
import { ActivityTimeline, DEVELOPER_STATUS_LABELS, DeveloperStatusBadge, FreshnessCell, FreshnessLegend, InfoCard, ProjectStatusBadge } from "./crm-ui";

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const SORTS = [
  { value: "activity", label: "Most recent activity first" },
  { value: "activityAsc", label: "Least recent activity first" },
  { value: "updateAsc", label: "Oldest project update first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "projects", label: "Most projects" },
];

const ACTIVITY_FILTERS = [
  { value: "all", label: "Any activity" },
  { value: "recent", label: `Active in the last ${STALE_DAYS.warning} days` },
  { value: "30", label: "No activity for 30+ days" },
  { value: "60", label: "No activity for 60+ days" },
  { value: "90", label: "No activity for 90+ days" },
];

export type CrmFilters = { q?: string; status?: string; location?: string; activity?: string; sort?: string };

type Props = { rows: DeveloperRow[]; stats: DeveloperCrmStats; recent: Activity[]; initial: CrmFilters };

const time = (iso: string | null) => (iso ? Date.parse(iso) : 0);

export default function DeveloperCrmPage({ rows, stats, recent, initial }: Props) {
  const [query, setQuery] = useState(initial.q ?? "");
  const [status, setStatus] = useState(initial.status ?? "all");
  const [location, setLocation] = useState(initial.location ?? "all");
  const [activity, setActivity] = useState(initial.activity ?? "all");
  const [sort, setSort] = useState(initial.sort ?? "activity");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Towns and provinces of developers and their projects
  const locations = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      [r.town, r.province, ...r.projects.flatMap((p) => [p.town, p.province])].forEach((l) => l && set.add(l.trim()));
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const loc = normalize(location);
    const out = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (location !== "all" && ![r.town, r.province, ...r.projects.flatMap((p) => [p.town, p.province])].some((l) => normalize(l.trim()) === loc)) return false;
      const d = r.daysSinceActivity;
      if (activity === "recent" && (d === null || d >= STALE_DAYS.warning)) return false;
      if (["30", "60", "90"].includes(activity) && d !== null && d < Number(activity)) return false;
      if (q && !normalize(`${r.name} ${r.legalName} ${r.contactPerson} ${r.email} ${r.cif} ${r.projects.map((p) => p.name).join(" ")}`).includes(q)) return false;
      return true;
    });
    const by: Record<string, (a: DeveloperRow, b: DeveloperRow) => number> = {
      activity: (a, b) => time(b.lastActivityAt) - time(a.lastActivityAt),
      activityAsc: (a, b) => time(a.lastActivityAt) - time(b.lastActivityAt),
      updateAsc: (a, b) => time(a.lastProjectUpdateAt) - time(b.lastProjectUpdateAt),
      name: (a, b) => a.name.localeCompare(b.name),
      projects: (a, b) => b.projectCount - a.projectCount,
    };
    return out.sort(by[sort] ?? by.activity);
  }, [rows, query, status, location, activity, sort]);

  // Who to call: no project update (or no activity at all) for 30+ days, the longest first
  const toContact = useMemo(
    () =>
      rows
        .filter((r) => r.status !== "inactive" && (r.freshness === "warning" || r.freshness === "danger" || r.freshness === "never"))
        .sort((a, b) => (b.daysSinceProjectUpdate ?? b.daysSinceActivity ?? 1e6) - (a.daysSinceProjectUpdate ?? a.daysSinceActivity ?? 1e6))
        .slice(0, 6),
    [rows]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * ADMIN_PAGE_SIZE, current * ADMIN_PAGE_SIZE);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };
  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <AdminPage
      title="Developer CRM"
      description="Every property developer on the platform, their developments, and how actively they keep them up to date."
      actions={
        <Link href={ADMIN_ROUTES.newDeveloper} className={buttonVariants()}>
          <Plus aria-hidden className="size-4" />
          Add developer
        </Link>
      }
    >
      <CrmTabs />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Developers" value={stats.developers} href={ADMIN_ROUTES.developers} />
        <StatCard label="Active" value={stats.active} href={`${ADMIN_ROUTES.developers}?status=active`} />
        <StatCard label="Projects" value={stats.projects} href={ADMIN_ROUTES.projects} />
        <StatCard label="Under construction" value={stats.underConstruction} href={`${ADMIN_ROUTES.projects}?status=construction`} />
        <StatCard label="Completed" value={stats.completed} href={`${ADMIN_ROUTES.projects}?status=completed`} />
        <StatCard label="Updated (30 days)" value={stats.recentlyUpdated} href={`${ADMIN_ROUTES.projects}?updated=recent`} />
        <StatCard label="No recent activity" value={stats.noRecentActivity} tone="warning" href={`${ADMIN_ROUTES.developers}?activity=30&sort=activityAsc`} hint="30+ days" />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <InfoCard title="Projects not updated">
          <div className="grid grid-cols-3 gap-3">
            {([30, 60, 90] as const).map((d) => (
              <Link key={d} href={`${ADMIN_ROUTES.projects}?stale=${d}`} className="rounded-lg border p-3 outline-none hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring">
                <p className="text-xs text-muted-foreground">{d}+ days</p>
                <p className={`text-2xl font-semibold tabular-nums ${stats.stale[d] > 0 ? (d >= 90 ? "text-destructive" : "text-warning") : ""}`}>{stats.stale[d]}</p>
              </Link>
            ))}
          </div>
          <div className="mt-3">
            <FreshnessLegend />
          </div>
        </InfoCard>
        <InfoCard title="Needs contacting">
          {toContact.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every active developer has updated a project in the last {STALE_DAYS.warning} days.</p>
          ) : (
            <ul className="divide-y text-sm">
              {toContact.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={ADMIN_ROUTES.developer(r.id)} className="min-w-0 truncate font-medium hover:underline">
                    {r.name}
                  </Link>
                  <span className="flex shrink-0 items-center gap-3">
                    <FreshnessCell iso={r.lastProjectUpdateAt} days={r.daysSinceProjectUpdate} freshness={r.lastProjectUpdateAt ? r.freshness : "never"} />
                    {(r.contactEmail || r.email) && (
                      <a href={`mailto:${r.contactEmail || r.email}`} className="text-muted-foreground hover:text-foreground" aria-label={`Email ${r.name}`} title={`Email ${r.contactEmail || r.email}`}>
                        <Mail aria-hidden className="size-4" />
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </InfoCard>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Developer database</h2>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => reset(setQuery)(e.target.value)} placeholder="Developer, project, contact or email" aria-label="Search developers and projects" className="pl-8" />
        </div>
        <SimpleSelect aria-label="Status" value={status} onChange={reset(setStatus)} options={[{ value: "all", label: "All statuses" }, ...DEVELOPER_STATUSES.map((s) => ({ value: s, label: DEVELOPER_STATUS_LABELS[s] }))]} />
        <SimpleSelect aria-label="Location" value={location} onChange={reset(setLocation)} options={[{ value: "all", label: "All locations" }, ...locations.map((l) => ({ value: l, label: l }))]} />
        <SimpleSelect aria-label="Activity" value={activity} onChange={reset(setActivity)} options={ACTIVITY_FILTERS} />
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "developer" : "developers"}
        </p>
        <SimpleSelect aria-label="Sort" value={sort} onChange={setSort} options={SORTS} className="w-64" />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"><span className="sr-only">Show projects</span></TableHead>
              <TableHead>Developer</TableHead>
              <TableHead className="text-right">Projects</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last project update</TableHead>
              <TableHead>Last activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  {rows.length === 0 ? (
                    <>
                      No developers yet.{" "}
                      <Link href={ADMIN_ROUTES.newDeveloper} className="font-medium text-foreground underline">
                        Add the first one
                      </Link>{" "}
                      or mark an existing account as a developer.
                    </>
                  ) : (
                    "No developers match these filters."
                  )}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((r) => {
                const isOpen = open.has(r.id);
                return (
                  <Fragment key={r.id}>
                    <TableRow>
                      <TableCell>
                        {r.projectCount > 0 && (
                          <button type="button" onClick={() => toggle(r.id)} aria-expanded={isOpen} aria-label={`${isOpen ? "Hide" : "Show"} projects of ${r.name}`} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                            {isOpen ? <ChevronDown aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="flex items-center gap-3">
                          {r.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.logo} alt="" className="size-8 shrink-0 rounded object-contain" />
                          ) : (
                            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded bg-muted text-sm font-semibold">{r.name[0]?.toUpperCase()}</span>
                          )}
                          <div className="min-w-0">
                            <Link href={ADMIN_ROUTES.developer(r.id)} className="block truncate font-medium hover:underline">
                              {r.name}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">{r.contactPerson || r.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.projectCount}
                        <span className="block text-xs text-muted-foreground">{r.propertyCount} listings</span>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <p className="truncate">{r.town || "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{[r.province, r.country].filter(Boolean).join(", ")}</p>
                      </TableCell>
                      <TableCell>
                        <DeveloperStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>
                        <FreshnessCell iso={r.lastProjectUpdateAt} days={r.daysSinceProjectUpdate} freshness={r.lastProjectUpdateAt ? freshness(r.daysSinceProjectUpdate) : "never"} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <LocalTime iso={r.lastActivityAt} mode="date" empty="Never" />
                        {r.lastLoginAt && (
                          <span className="block text-xs text-muted-foreground">
                            login <LocalTime iso={r.lastLoginAt} mode="date" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={ADMIN_ROUTES.developer(r.id)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                            Open
                          </Link>
                          <Link href={ADMIN_ROUTES.editDeveloper(r.id)} className={buttonVariants({ variant: "ghost", size: "sm" })} aria-label={`Edit ${r.name}`} title="Edit">
                            <Pencil aria-hidden className="size-4" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isOpen &&
                      r.projects.map((p) => (
                        <TableRow key={p.id} className="bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={2} className="pl-6">
                            <Link href={ADMIN_ROUTES.project(r.id, p.id)} className="font-medium hover:underline">
                              {p.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{[p.town, p.province].filter(Boolean).join(", ")}</TableCell>
                          <TableCell>
                            <ProjectStatusBadge status={p.status} />
                          </TableCell>
                          <TableCell>
                            <FreshnessCell iso={p.lastUpdateAt} days={p.daysSinceUpdate} freshness={p.freshness} />
                          </TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      ))}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4">
        <Pagination page={current} pageCount={pageCount} onChange={setPage} />
      </div>

      <div className="mt-10">
        <InfoCard title="Latest project updates" action={<Link href={ADMIN_ROUTES.projects} className="text-sm text-muted-foreground hover:text-foreground">All projects</Link>}>
          <ActivityTimeline items={recent} showDeveloper empty="No project updates yet." />
        </InfoCard>
      </div>
    </AdminPage>
  );
}
