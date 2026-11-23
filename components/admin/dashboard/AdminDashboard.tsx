"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { ADMIN_ROUTES, FEED_ERROR_TEXT } from "@/lib/constants/admin";
import type { AdminDashboardData } from "@/lib/server/admin/dashboard";
import { ActivityTimeline } from "../developers/crm-ui";
import AdminPage from "../ui/AdminPage";
import StatCard from "../ui/StatCard";
import { useAdminFormat } from "../ui/useAdminFormat";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}

/** All numbers are counted on the server (lib/server/admin/dashboard.ts). */
export default function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const f = useAdminFormat();
  const { pending, brokenFeeds: broken, agencies, developers } = data;

  return (
    <AdminPage title="Dashboard" description="The whole platform at a glance: estate agencies, property developers and the MLS.">
      <Section title="Needs attention">
        <StatCard label="Pending applications" value={data.pendingCount} href={ADMIN_ROUTES.applications} tone="warning" />
        <StatCard label="Feeds with errors" value={broken.length} href={ADMIN_ROUTES.feeds} tone="danger" />
        <StatCard label="Client registrations waiting" value={data.registrations.pending} href={ADMIN_ROUTES.developers} tone="warning" hint="Waiting for the developer to decide" />
        <StatCard label="Properties hidden by admin" value={data.hiddenByAdmin} href={ADMIN_ROUTES.properties} />
      </Section>

      <Section title="Estate agencies">
        <StatCard label="Active agencies" value={agencies.active} href={ADMIN_ROUTES.agencies} hint={`${agencies.trial} on trial · ${agencies.suspended} suspended · ${agencies.cancelled} cancelled`} />
        <StatCard label="New agencies (30 days)" value={data.newAccounts.agencies} href={ADMIN_ROUTES.agencies} />
        <StatCard label="Agency logins used (30 days)" value={data.activeLogins.agency} href={ADMIN_ROUTES.agencies} />
        <StatCard label="Import feeds" value={data.feedCount} href={ADMIN_ROUTES.feeds} />
      </Section>

      <Section title="Property developers">
        <StatCard label="Active developers" value={developers.active} href={ADMIN_ROUTES.developers} hint={`${developers.suspended} suspended · ${developers.cancelled} cancelled · ${data.activeLogins.developer} logged in (30 days)`} />
        <StatCard label="Developments" value={data.developments.total} href={ADMIN_ROUTES.projects} hint={`${data.developments.published} published · ${data.developments.draft} draft`} />
        <StatCard label="Units available" value={data.units.available} href={ADMIN_ROUTES.projects} hint={`${data.units.reserved} reserved · ${data.units.sold} sold`} />
        <StatCard label="Client registrations (30 days)" value={data.registrations.last30} href={ADMIN_ROUTES.developers} />
      </Section>

      <Section title="MLS · last 30 days">
        <StatCard label="Properties on the network" value={data.onNetwork} href={ADMIN_ROUTES.properties} hint={`${data.propertyCount} in total`} />
        <StatCard label="New listings" value={data.mls.newListings} href={ADMIN_ROUTES.properties} />
        <StatCard label="Property views" value={data.mls.views} href={ADMIN_ROUTES.properties} hint="One visitor per property per day" />
        <StatCard label="WhatsApp clicks" value={data.mls.whatsapp} href={ADMIN_ROUTES.properties} hint={data.mls.contacts ? `${data.mls.contacts} contact clicks` : undefined} />
      </Section>

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
      <section className="mt-6 rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Latest development updates</h2>
          <Link href={ADMIN_ROUTES.developers} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Developer CRM
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ActivityTimeline items={data.recentActivity} showDeveloper empty="No development updates yet." />
      </section>
    </AdminPage>
  );
}
