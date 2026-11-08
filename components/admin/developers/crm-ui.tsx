"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import SimpleSelect from "@/components/panel/SimpleSelect";
import LocalTime from "@/components/developers/LocalTime";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import {
  ACTIVITY_SOURCE_LABELS,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPES,
  PROJECT_STATUS_LABELS,
  STALE_DAYS,
  type DeveloperStatus,
  type Freshness,
  type ProjectStatus,
} from "@/lib/constants/developers";
import type { Activity } from "@/types/developers";

/* Small building blocks shared by the Developer CRM pages. */

const PROJECT_STATUS_STYLE: Record<ProjectStatus, string> = {
  planning: "bg-muted text-muted-foreground",
  construction: "bg-info-soft text-info",
  completed: "bg-success-soft text-success",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="secondary" className={PROJECT_STATUS_STYLE[status]}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}

const DEV_STATUS: Record<DeveloperStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success-soft text-success" },
  pending: { label: "Pending", className: "bg-warning-soft text-warning" },
  inactive: { label: "Inactive", className: "bg-muted text-muted-foreground" },
};

export const DEVELOPER_STATUS_LABELS: Record<DeveloperStatus, string> = { active: "Active", pending: "Pending", inactive: "Inactive" };

export function DeveloperStatusBadge({ status }: { status: DeveloperStatus }) {
  return (
    <Badge variant="secondary" className={DEV_STATUS[status].className} title={status === "pending" ? "Hasn't logged in yet" : undefined}>
      {DEV_STATUS[status].label}
    </Badge>
  );
}

const DOT: Record<Freshness, string> = {
  fresh: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  never: "bg-border-strong",
};
const FRESH_TEXT: Record<Freshness, string> = {
  fresh: `Updated in the last ${STALE_DAYS.warning} days`,
  warning: `No updates for ${STALE_DAYS.warning}+ days`,
  danger: `No updates for ${STALE_DAYS.danger}+ days`,
  never: "No updates yet",
};

const ago = (days: number) => (days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`);

/** Coloured dot (green / orange / red) + the date and how long ago. */
export function FreshnessCell({ iso, days, freshness }: { iso: string | null; days: number | null; freshness: Freshness }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap" title={FRESH_TEXT[freshness]}>
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${DOT[freshness]}`} />
      <span className="sr-only">{FRESH_TEXT[freshness]}: </span>
      {iso ? (
        <span>
          <LocalTime iso={iso} mode="date" />
          {days !== null && <span className="block text-xs text-muted-foreground">{ago(days)}</span>}
        </span>
      ) : (
        <span className="text-muted-foreground">Never</span>
      )}
    </span>
  );
}

export function FreshnessLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(["fresh", "warning", "danger"] as const).map((f) => (
        <span key={f} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`size-2 rounded-full ${DOT[f]}`} />
          {FRESH_TEXT[f]}
        </span>
      ))}
    </p>
  );
}

export function InfoCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value || value === 0 ? value : "—"}</dd>
    </div>
  );
}

export const priceRange = (from: number | null, to: number | null, currency: string) => {
  const f = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  if (from === null && to === null) return "";
  if (from !== null && to !== null && from !== to) return `${f(from)} – ${f(to)}`;
  return from !== null ? `from ${f(from)}` : `up to ${f(to!)}`;
};

export const range = (min: number | null, max: number | null) =>
  min === null && max === null ? "" : min !== null && max !== null && min !== max ? `${min}–${max}` : String(min ?? max);

const SOURCE_STYLE: Record<Activity["source"], string> = {
  developer: "bg-info-soft text-info",
  admin: "bg-secondary text-secondary-foreground",
  api_import: "bg-warning-soft text-warning",
  system: "bg-muted text-muted-foreground",
};

type TimelineProps = {
  items: Activity[];
  /** Show which project each entry is about (developer-wide timelines). */
  showProject?: boolean;
  /** Show the developer's name (the CRM-wide feed). */
  showDeveloper?: boolean;
  /** Show the type filter above the list. */
  filterable?: boolean;
  empty?: string;
};

/** The update history, newest first, grouped by day (in the viewer's time zone). */
export function ActivityTimeline({ items, showProject, showDeveloper, filterable, empty = "No activity yet." }: TimelineProps) {
  const [type, setType] = useState("all");
  const [source, setSource] = useState("all");
  const visible = useMemo(
    () => items.filter((a) => (type === "all" ? true : type === "changes" ? a.type !== "login" : a.type === type) && (source === "all" || a.source === source)),
    [items, type, source]
  );
  const present = new Set(items.map((a) => a.type));

  return (
    <div>
      {filterable && items.length > 0 && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:max-w-lg">
          <SimpleSelect
            aria-label="Type of update"
            value={type}
            onChange={setType}
            options={[
              { value: "all", label: "All activity" },
              { value: "changes", label: "Changes only (no logins)" },
              ...ACTIVITY_TYPES.filter((t) => present.has(t)).map((t) => ({ value: t, label: ACTIVITY_TYPE_LABELS[t] })),
            ]}
          />
          <SimpleSelect
            aria-label="Source"
            value={source}
            onChange={setSource}
            options={[{ value: "all", label: "Every source" }, ...(["developer", "admin", "api_import", "system"] as const).map((s) => ({ value: s, label: ACTIVITY_SOURCE_LABELS[s] }))]}
          />
        </div>
      )}
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{items.length === 0 ? empty : "Nothing matches these filters."}</p>
      ) : (
        <ol className="relative space-y-4 border-l pl-5">
          {visible.map((a) => (
            <li key={a.id} className="relative">
              <span aria-hidden className={`absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background ${a.type === "login" ? "bg-border-strong" : a.type === "note" ? "bg-brand-light" : "bg-primary"}`} />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <LocalTime iso={a.createdAt} />
                <Badge variant="secondary" className={SOURCE_STYLE[a.source]}>
                  {ACTIVITY_SOURCE_LABELS[a.source]}
                </Badge>
                <span className="font-medium text-foreground/80">{ACTIVITY_TYPE_LABELS[a.type]}</span>
                {a.actor.email && <span>· {a.actor.email}</span>}
              </div>
              <p className={`mt-0.5 text-sm ${a.type === "login" ? "text-muted-foreground" : ""}`}>
                {showDeveloper && (
                  <Link href={ADMIN_ROUTES.developer(a.developerId)} className="font-medium hover:underline">
                    {a.developerName}
                  </Link>
                )}
                {showDeveloper && a.projectName && " · "}
                {(showProject || showDeveloper) && a.projectName && (
                  a.projectId && a.type !== "project_deleted" ? (
                    <Link href={ADMIN_ROUTES.project(a.developerId, a.projectId)} className="font-medium hover:underline">
                      {a.projectName}
                    </Link>
                  ) : (
                    <span className="font-medium">{a.projectName}</span>
                  )
                )}
                {(showProject || showDeveloper) && (a.projectName || showDeveloper) && ": "}
                <span className="whitespace-pre-line">{a.description}</span>
              </p>
              {(a.previousValue !== null || a.newValue !== null) && a.type !== "project_created" && (
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground line-through decoration-muted-foreground/50">{a.previousValue ?? "empty"}</span>
                  <ArrowRight aria-hidden className="size-3 text-muted-foreground" />
                  <span className="rounded bg-muted px-1.5 py-0.5">{a.newValue ?? "empty"}</span>
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
