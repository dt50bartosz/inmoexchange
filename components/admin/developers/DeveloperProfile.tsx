"use client";

import { useState } from "react";
import { ArrowLeft, ClipboardList, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LocalTime from "@/components/developers/LocalTime";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/constants/developers";
import type { Activity, Developer, DeveloperContact, DeveloperNote, Project } from "@/types/developers";
import AdminPage from "../ui/AdminPage";
import AccountPanel from "./AccountPanel";
import { ActivityTimeline, DeveloperStatusBadge, FreshnessCell, InfoCard, ProjectStatusBadge, Row, priceRange } from "./crm-ui";
import DeveloperContacts from "./DeveloperContacts";
import DeveloperNotes from "./DeveloperNotes";

export const PROFILE_TABS = ["overview", "projects", "activity", "contacts", "notes", "account"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];
const TAB_LABELS: Record<ProfileTab, string> = { overview: "Overview", projects: "Projects", activity: "Activity history", contacts: "Contacts", notes: "Internal notes", account: "Account" };

type Props = {
  developer: Developer;
  projects: Project[];
  activity: Activity[];
  contacts: DeveloperContact[];
  notes: DeveloperNote[];
  tab: ProfileTab;
  /** Client registrations by agencies: with any, the account can only be cancelled, not deleted. */
  registrationCount: number;
};


export default function DeveloperProfile({ developer: d, projects, activity, contacts, notes, tab: initialTab, registrationCount }: Props) {
  const to = useTranslations("panel.options");
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  const changes = activity.filter((a) => a.type !== "login");

  const changeTab = (value: unknown) => {
    const next = PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "overview";
    setTab(next);
    // Keep the tab in the address, so reloads and shared links open it
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  const byStatus = PROJECT_STATUSES.map((s) => ({ s, n: projects.filter((p) => p.status === s).length })).filter((x) => x.n > 0);
  const units = projects.reduce((n, p) => n + (p.unitsTotal ?? 0), 0);
  const available = projects.reduce((n, p) => n + (p.unitsAvailable ?? 0), 0);

  return (
    <AdminPage
      title={d.name}
      description={[d.town, d.province, d.country].filter(Boolean).join(", ") || "No location"}
      back={
        <Link href={ADMIN_ROUTES.developers} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Developer CRM
        </Link>
      }
      actions={
        <>
          <Link href={ADMIN_ROUTES.newProject(d.id)} className={buttonVariants()}>
            <Plus aria-hidden className="size-4" />
            Add project
          </Link>
          <Link href={ADMIN_ROUTES.developerRegistrations(d.id)} className={buttonVariants({ variant: "outline" })}>
            <ClipboardList aria-hidden className="size-4" />
            Client registrations
            {registrationCount > 0 && <span className="text-xs text-muted-foreground tabular-nums">{registrationCount}</span>}
          </Link>
          <Link href={ADMIN_ROUTES.editDeveloper(d.id)} className={buttonVariants({ variant: "outline" })}>
            <Pencil aria-hidden className="size-4" />
            Edit profile
          </Link>
        </>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {d.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.logo} alt="" className="size-10 rounded border object-contain" />
        )}
        <DeveloperStatusBadge status={d.status} />
        <span className="text-sm text-muted-foreground">
          Last project update: <FreshnessCell iso={d.lastProjectUpdateAt} days={d.daysSinceProjectUpdate} freshness={d.lastProjectUpdateAt ? d.freshness : "never"} />
        </span>
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <div className="overflow-x-auto">
          <TabsList variant="line" className="mb-4">
            {PROFILE_TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="px-3">
                {TAB_LABELS[t]}
                {t === "projects" && <span className="ml-1 text-xs text-muted-foreground tabular-nums">{projects.length}</span>}
                {t === "notes" && notes.length > 0 && <span className="ml-1 text-xs text-muted-foreground tabular-nums">{notes.length}</span>}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            <InfoCard title="Company">
              <dl>
                <Row label="Legal name" value={d.legalName} />
                <Row label="Registration no." value={d.cif} />
                <Row label="Address" value={[d.street, [d.postcode, d.town].filter(Boolean).join(" "), d.province, d.country].filter(Boolean).join(", ")} />
                <Row label="Website" value={d.website && <a href={d.website} target="_blank" rel="noreferrer" className="hover:underline">{d.website}</a>} />
                <Row label="Contact person" value={[d.contactPerson, d.contactPosition].filter(Boolean).join(" · ")} />
                <Row label="Contact email" value={(d.contactEmail || d.email) && <a href={`mailto:${d.contactEmail || d.email}`} className="hover:underline">{d.contactEmail || d.email}</a>} />
                <Row label="Phone" value={d.phone} />
                <Row label="Areas" value={d.regions.map((r) => to(`regions.${r}`)).join(", ")} />
              </dl>
            </InfoCard>
            <InfoCard title="Account">
              <dl>
                <Row label="Status" value={<DeveloperStatusBadge status={d.status} />} />
                <Row label="Login email" value={d.email} />
                <Row label="Registered" value={<LocalTime iso={d.createdAt} mode="date" />} />
                <Row label="Last login" value={<LocalTime iso={d.lastLoginAt} empty="Never" />} />
                <Row label="Last activity" value={<LocalTime iso={d.lastActivityAt} empty="Never" />} />
                <Row label="Relationship manager" value={d.relationshipManager?.email ?? "Nobody yet"} />
                <Row label="Projects" value={<span className="tabular-nums">{d.projectCount}</span>} />
                <Row label="Properties" value={<span className="tabular-nums">{d.propertyCount}</span>} />
              </dl>
            </InfoCard>
            <InfoCard title="Portfolio">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects yet. The developer can add them in its panel, or use “Add project”.</p>
              ) : (
                <dl>
                  {byStatus.map(({ s, n }) => (
                    <Row key={s} label={PROJECT_STATUS_LABELS[s]} value={<span className="tabular-nums">{n}</span>} />
                  ))}
                  <Row label="Units (declared)" value={<span className="tabular-nums">{units ? `${units} · ${available} available` : ""}</span>} />
                </dl>
              )}
            </InfoCard>
            <InfoCard title="Most recent project updates" action={changes.length > 0 && <button type="button" onClick={() => changeTab("activity")} className="text-sm text-muted-foreground hover:text-foreground">All activity</button>}>
              <ActivityTimeline items={changes.slice(0, 6)} showProject empty="No project updates yet." />
            </InfoCard>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Last update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No projects yet.{" "}
                      <Link href={ADMIN_ROUTES.newProject(d.id)} className="font-medium text-foreground underline">
                        Add one
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[260px]">
                        <Link href={ADMIN_ROUTES.project(p.developerId, p.id)} className="block truncate font-medium hover:underline">
                          {p.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">{p.visibility === "draft" ? "Draft (hidden from agencies)" : "Published"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{[p.town, p.province].filter(Boolean).join(", ")}</TableCell>
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
        </TabsContent>

        <TabsContent value="activity">
          <InfoCard title="Activity history">
            <ActivityTimeline items={activity} showProject filterable empty="Nothing recorded yet. Project changes and logins appear here." />
          </InfoCard>
        </TabsContent>

        <TabsContent value="contacts">
          <DeveloperContacts developer={d} contacts={contacts} />
        </TabsContent>

        <TabsContent value="account">
          <AccountPanel developer={d} registrationCount={registrationCount} />
        </TabsContent>

        <TabsContent value="notes">
          <InfoCard title="Internal notes">
            <DeveloperNotes developerId={d.id} notes={notes} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
          </InfoCard>
        </TabsContent>
      </Tabs>

    </AdminPage>
  );
}
