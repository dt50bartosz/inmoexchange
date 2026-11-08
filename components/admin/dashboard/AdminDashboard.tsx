"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { ADMIN_ROUTES, FEED_ERROR_TEXT } from "@/lib/constants/admin";
import type { AdminDashboardData } from "@/lib/server/admin/dashboard";
import AdminPage from "../ui/AdminPage";
import StatCard from "../ui/StatCard";
import { useAdminFormat } from "../ui/useAdminFormat";

/** All numbers are counted on the server (lib/server/admin/dashboard.ts). */
export default function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const f = useAdminFormat();
  const { pending, brokenFeeds: broken, agencies } = data;

  return (
    <AdminPage title="Dashboard" description="What needs your attention on inmoexchange.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Pending applications" value={data.pendingCount} href={ADMIN_ROUTES.applications} tone="warning" />
        <StatCard label="Feeds with errors" value={broken.length} href={`${ADMIN_ROUTES.feeds}`} tone="danger" />
        <StatCard label="Properties hidden by admin" value={data.hiddenByAdmin} href={ADMIN_ROUTES.properties} />
        <StatCard
          label="Active agencies"
          value={agencies.active}
          href={ADMIN_ROUTES.agencies}
          hint={`${agencies.trial} on trial · ${agencies.suspended} suspended`}
        />
        <StatCard label="Properties on the network" value={data.onNetwork} href={ADMIN_ROUTES.properties} hint={`${data.propertyCount} in total`} />
        <StatCard label="Import feeds" value={data.feedCount} href={ADMIN_ROUTES.feeds} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">New applications</h2>
            <Link href={ADMIN_ROUTES.applications} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Review
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new applications.</p>
          ) : (
            <ul className="divide-y text-sm">
              {pending.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.agencyName}</span>
                    <span className="block truncate text-muted-foreground">{a.areas}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{f.date(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Broken feeds</h2>
            <Link href={ADMIN_ROUTES.feeds} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              All feeds
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          {broken.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every feed is syncing fine.</p>
          ) : (
            <ul className="divide-y text-sm">
              {broken.map((x) => (
                <li key={x.id} className="py-2">
                  <p className="flex items-center gap-1.5 font-medium">
                    <AlertTriangle aria-hidden className="size-4 text-destructive" />
                    {x.agencyName}
                  </p>
                  <p className="text-muted-foreground">{x.lastError ? (FEED_ERROR_TEXT[x.lastError] ?? x.lastError) : x.name}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminPage>
  );
}
