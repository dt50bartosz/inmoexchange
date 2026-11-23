"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LocalTime from "@/components/developers/LocalTime";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import type { MlsListing, MlsMonitor, QualityCheck } from "@/lib/server/admin/mls";
import AdminPage from "../ui/AdminPage";
import StatCard from "../ui/StatCard";
import { useAdminFormat } from "../ui/useAdminFormat";

const ISSUE_LABELS: Record<QualityCheck, string> = {
  noPhotos: "No photos",
  fewPhotos: "Fewer than 5 photos",
  noDescription: "No description",
  noPrice: "No price",
  noLocation: "Town not recognised",
  noCoordinates: "No map position",
};

const propertyHref = (l: MlsListing) => ({ pathname: ADMIN_ROUTES.properties, query: { q: l.code || l.reference } });

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mb-3 text-sm text-muted-foreground">{description}</p>}
      {children}
    </section>
  );
}

function ListingTable({ rows, empty, showIssues }: { rows: MlsListing[]; empty: string; showIssues?: boolean }) {
  const f = useAdminFormat();
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow>
            <TableHead>Listing</TableHead>
            <TableHead>Agency</TableHead>
            <TableHead>Town</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>{showIssues ? "Issues" : "Last update"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <Link href={propertyHref(l)} className="font-medium hover:underline">
                    {l.code || l.reference || "—"}
                  </Link>
                  {l.code && l.reference && <span className="block text-xs text-muted-foreground">{l.reference}</span>}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  <Link href={ADMIN_ROUTES.agency(l.agencyId)} className="hover:underline">
                    {l.agencyName}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-muted-foreground">{l.town || "—"}</TableCell>
                <TableCell className="text-right whitespace-nowrap tabular-nums">{l.price ? f.money(l.price) : "—"}</TableCell>
                <TableCell>
                  {showIssues ? (
                    <div className="flex flex-wrap gap-1">
                      {l.issues.map((i) => (
                        <Badge key={i} variant={i === "noPhotos" || i === "noPrice" ? "destructive" : "outline"}>
                          {ISSUE_LABELS[i]}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="whitespace-nowrap">
                      <LocalTime iso={l.updatedAt} mode="date" />
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/** Everything is counted on the server (lib/server/admin/mls.ts). */
export default function MlsMonitorPage({ data }: { data: MlsMonitor }) {
  const f = useAdminFormat();
  const { totals, quality, stale } = data;
  const [tab, setTab] = useState("quality");
  const P = ADMIN_ROUTES.properties;

  return (
    <AdminPage title="MLS" description="How healthy the shared property network is: what agencies and the public can see, and what needs fixing.">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Live on the network" value={totals.live} href={P} hint={`${totals.all} listings in total · ${totals.fromFeeds} from XML feeds`} />
        <StatCard label="Private (not shared)" value={totals.private} href={P} hint="Only the agency sees them" />
        <StatCard label="Hidden" value={totals.hiddenByAgency + totals.hiddenByAdmin} href={P} hint={`${totals.hiddenByAgency} by the agency · ${totals.hiddenByAdmin} by an admin`} />
        <StatCard label="Agency suspended or cancelled" value={totals.blockedAgency} href={ADMIN_ROUTES.agencies} tone="warning" hint={`Not shown · ${totals.sold} sold or inactive`} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="mt-8">
        <TabsList>
          <TabsTrigger value="quality">Quality ({data.problemListings.length})</TabsTrigger>
          <TabsTrigger value="stale">Not updated ({stale[90]})</TabsTrigger>
          <TabsTrigger value="duplicates">Possible duplicates ({data.duplicates.length})</TabsTrigger>
          <TabsTrigger value="agencies">By agency</TabsTrigger>
          <TabsTrigger value="areas">By area</TabsTrigger>
        </TabsList>

        <TabsContent value="quality">
          <Section title="Listing quality" description="Live listings missing something buyers and agencies rely on. Worst first, up to 100.">
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {(Object.keys(ISSUE_LABELS) as QualityCheck[]).map((k) => (
                <div key={k} className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{ISSUE_LABELS[k]}</p>
                  <p className={`text-2xl font-semibold tabular-nums ${quality[k] > 0 && (k === "noPhotos" || k === "noPrice") ? "text-destructive" : ""}`}>{quality[k]}</p>
                </div>
              ))}
            </div>
            <ListingTable rows={data.problemListings} showIssues empty="Every live listing has photos, a description, a price and a location." />
          </Section>
        </TabsContent>

        <TabsContent value="stale">
          <Section title="Not updated" description="Live listings nobody has changed for a long time: they may be sold or out of date. 90+ days shown, oldest first.">
            <div className="mb-4 grid grid-cols-3 gap-3">
              {([60, 90, 180] as const).map((d) => (
                <div key={d} className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{d}+ days</p>
                  <p className={`text-2xl font-semibold tabular-nums ${stale[d] > 0 && d >= 180 ? "text-destructive" : stale[d] > 0 ? "text-warning" : ""}`}>{stale[d]}</p>
                </div>
              ))}
            </div>
            <ListingTable rows={data.staleListings} empty="No live listing has gone 90 days without an update." />
          </Section>
        </TabsContent>

        <TabsContent value="duplicates">
          <Section
            title="Possible duplicates"
            description="The same property listed by different agencies: same type, town, bedrooms and price, similar size. Check before acting; it may be a genuine shared listing."
          >
            {data.duplicates.length === 0 ? (
              <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">No likely duplicates between agencies.</p>
            ) : (
              <div className="grid gap-4">
                {data.duplicates.map((g) => (
                  <ListingTable key={g.key} rows={g.listings} empty="" />
                ))}
              </div>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="agencies">
          <Section title="By agency" description="Where each agency's listings stand. Problems = live listings with a quality issue.">
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Agency</TableHead>
                    <TableHead className="text-right">Live</TableHead>
                    <TableHead className="text-right">Private</TableHead>
                    <TableHead className="text-right">Hidden</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">90+ days old</TableHead>
                    <TableHead className="text-right">Problems</TableHead>
                    <TableHead>Last update</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byAgency.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        No listings yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byAgency.map((a) => (
                      <TableRow key={a.agencyId}>
                        <TableCell className="max-w-[260px]">
                          <Link href={{ pathname: P, query: { agency: a.agencyId } }} className="block truncate font-medium hover:underline">
                            {a.agencyName}
                          </Link>
                          {a.blocked && <span className="text-xs text-destructive">Suspended or cancelled: nothing shown</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{a.live}</TableCell>
                        <TableCell className="text-right tabular-nums">{a.private}</TableCell>
                        <TableCell className="text-right tabular-nums">{a.hidden + a.moderated}</TableCell>
                        <TableCell className="text-right tabular-nums">{a.sold}</TableCell>
                        <TableCell className={`text-right tabular-nums ${a.stale90 ? "text-warning" : ""}`}>{a.stale90}</TableCell>
                        <TableCell className={`text-right tabular-nums ${a.withIssues ? "text-destructive" : ""}`}>{a.withIssues}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          <LocalTime iso={a.lastUpdateAt} mode="date" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="areas">
          <Section title="By area" description="Live listings per province, with the average asking price.">
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Province</TableHead>
                    <TableHead className="text-right">Live listings</TableHead>
                    <TableHead className="text-right">Average price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byProvince.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                        No live listings yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.byProvince.map((p) => (
                      <TableRow key={p.province}>
                        <TableCell className="font-medium">{p.province}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.live}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.avgPrice ? f.money(p.avgPrice) : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
}
