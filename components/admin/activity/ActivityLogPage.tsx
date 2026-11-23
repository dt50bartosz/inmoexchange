"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SimpleSelect from "@/components/panel/SimpleSelect";
import Pagination from "@/components/properties/list/Pagination";
import LocalTime from "@/components/developers/LocalTime";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { PLATFORM_EVENT_LABELS, PLATFORM_EVENT_TYPES, type PlatformEvent, type PlatformEventType } from "@/types/platform-events";
import AdminPage from "../ui/AdminPage";

type Filters = { type: string; orgType: string; actor: string; days: string; q: string };

type Props = { items: PlatformEvent[]; total: number; page: number; pageCount: number; filters: Filters };

/** Events that deserve a second look stand out. */
const TONE: Partial<Record<PlatformEventType, "destructive" | "secondary">> = {
  login_refused: "destructive",
  account_deleted: "destructive",
  property_hidden: "destructive",
  status_changed: "secondary",
  login_email_changed: "secondary",
};

const ROLE_LABEL = { admin: "Admin", agency: "Agency", developer: "Developer" } as const;

/** Filters live in the URL (the server filters and pages); this only edits them. */
export default function ActivityLogPage({ items, total, page, pageCount, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(filters.q);

  const go = (next: Partial<Filters> & { page?: number }) => {
    const merged = { ...filters, ...next };
    const query: Record<string, string> = {};
    if (merged.type) query.type = merged.type;
    if (merged.orgType) query.org = merged.orgType;
    if (merged.actor) query.by = merged.actor;
    if (merged.days) query.days = merged.days;
    if (merged.q) query.q = merged.q;
    if (next.page && next.page > 1) query.page = String(next.page);
    router.push({ pathname, query });
  };

  return (
    <AdminPage title="Activity" description="Logins and account events across every agency and developer. Development changes stay in each development's history.">
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <form
          className="relative sm:col-span-2 lg:col-span-1"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: q.trim() });
          }}
        >
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Account, email or text" aria-label="Search activity" className="pl-8" />
        </form>
        <SimpleSelect
          aria-label="Event"
          value={filters.type || "all"}
          onChange={(v) => go({ type: v === "all" ? "" : v })}
          options={[{ value: "all", label: "All events" }, ...PLATFORM_EVENT_TYPES.map((t) => ({ value: t, label: PLATFORM_EVENT_LABELS[t] }))]}
        />
        <SimpleSelect
          aria-label="Account type"
          value={filters.orgType || "all"}
          onChange={(v) => go({ orgType: v === "all" ? "" : v })}
          options={[
            { value: "all", label: "Agencies and developers" },
            { value: "agency", label: "Agencies only" },
            { value: "developer", label: "Developers only" },
            { value: "none", label: "No account (admin logins…)" },
          ]}
        />
        <SimpleSelect
          aria-label="Done by"
          value={filters.actor || "all"}
          onChange={(v) => go({ actor: v === "all" ? "" : v })}
          options={[
            { value: "all", label: "Done by anyone" },
            { value: "admin", label: "Done by an admin" },
            { value: "agency", label: "Done by an agency" },
            { value: "developer", label: "Done by a developer" },
          ]}
        />
        <SimpleSelect
          aria-label="Period"
          value={filters.days || "all"}
          onChange={(v) => go({ days: v === "all" ? "" : v })}
          options={[
            { value: "all", label: "Any time" },
            { value: "1", label: "Last 24 hours" },
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
          ]}
        />
      </div>

      <p className="mb-2 text-sm text-muted-foreground" aria-live="polite">
        {total} {total === 1 ? "event" : "events"}
      </p>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Done by</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  {total === 0 && !Object.values(filters).some(Boolean) ? "Nothing recorded yet. Logins and admin actions appear here from now on." : "No events match these filters."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <LocalTime iso={e.createdAt} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={TONE[e.type] ?? "outline"}>{PLATFORM_EVENT_LABELS[e.type] ?? e.type}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    {e.orgId ? (
                      <>
                        <Link href={e.orgType === "developer" ? ADMIN_ROUTES.developer(e.orgId) : ADMIN_ROUTES.agency(e.orgId)} className="block truncate font-medium hover:underline">
                          {e.orgName || "—"}
                        </Link>
                        <span className="text-xs text-muted-foreground">{e.orgType === "developer" ? "Developer" : "Agency"}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <p className="truncate" title={e.actor.email}>
                      {e.actor.email}
                    </p>
                    <span className="text-xs text-muted-foreground">{ROLE_LABEL[e.actor.role] ?? e.actor.role}</span>
                  </TableCell>
                  <TableCell className="max-w-[360px] text-sm">{e.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4">
        <Pagination page={page} pageCount={pageCount} onChange={(p) => go({ page: p })} />
      </div>
    </AdminPage>
  );
}
