"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, ExternalLink, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_ROUTES, APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/constants/admin";
import type { AgencyApplication } from "@/types/admin";
import AdminPage from "../ui/AdminPage";
import { useAdminFormat } from "../ui/useAdminFormat";
import ApproveDialog from "./ApproveDialog";
import RejectDialog from "./RejectDialog";

const LABEL: Record<ApplicationStatus, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
const PAYMENT: Record<string, string> = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };

/** Agency (/registro) or developer (/promotoras). Older applications have no type: agency. */
type Kind = "agency" | "developer";
const kindOf = (a: AgencyApplication): Kind => a.registration?.accountType ?? "agency";
const TYPE_FILTERS: { value: Kind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "agency", label: "Agencies" },
  { value: "developer", label: "Developers" },
];

function Row({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`flex gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children || "—"}</dd>
    </div>
  );
}

/** The /join register form details (IBAN arrives masked from the server). */
function RegistrationRows({ r }: { r: NonNullable<AgencyApplication["registration"]> }) {
  const f = useAdminFormat();
  const address = [r.street, [r.postcode, r.province].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return (
    <>
      <Row label="Brand name">{r.brandName}</Row>
      <Row label="RAICV">{r.raicv}</Row>
      <Row label="Address" wide>{address}</Row>
      <Row label="Website" wide>
        {r.website && (
          <a href={r.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {r.website}
          </a>
        )}
      </Row>
      <Row label="CEO / owner">{[r.ownerName, r.ownerIdNumber].filter(Boolean).join(" · ")}</Row>
      <Row label="More contact">{[r.phone2, r.email2].filter(Boolean).join(" · ")}</Row>
      <Row label="CRM">{[r.crm, r.crmAgencyNumber && `nº ${r.crmAgencyNumber}`].filter(Boolean).join(" · ")}</Row>
      <Row label="Payment">{[PAYMENT[r.paymentFrequency], r.iban].filter(Boolean).join(" · ")}</Row>
      <Row label="Language">{r.preferredLanguage === "es" ? "Spanish" : "English"}</Row>
      <Row label="Privacy">Accepted {f.dateTime(r.privacyAcceptedAt)}</Row>
    </>
  );
}

/** The /promotoras form details. */
function DeveloperRows({ a }: { a: AgencyApplication }) {
  const f = useAdminFormat();
  const r = a.registration;
  return (
    <>
      <Row label="Website" wide>
        {r?.website && (
          <a href={r.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {r.website}
          </a>
        )}
      </Row>
      <Row label="Developments">{a.activeDevelopments && `${a.activeDevelopments} active`}</Row>
      <Row label="Language">{r?.preferredLanguage === "es" ? "Spanish" : "English"}</Row>
      <Row label="Message" wide>
        {a.message && <span className="whitespace-pre-line">{a.message}</span>}
      </Row>
      {r && <Row label="Privacy">Accepted {f.dateTime(r.privacyAcceptedAt)}</Row>}
    </>
  );
}

export default function ApplicationsPage({ initialApplications }: { initialApplications: AgencyApplication[] }) {
  const f = useAdminFormat();
  const to = useTranslations("panel.options");
  const [all, setAll] = useState(initialApplications);

  /** Puts the server's version of an application into the list (it moves to the Approved / Rejected tab). */
  const replace = (updated: AgencyApplication) => setAll((list) => list.map((a) => (a.id === updated.id ? updated : a)));
  const [tab, setTab] = useState<ApplicationStatus>("pending");
  const [type, setType] = useState<Kind | "all">("all");
  const ofType = all.filter((a) => type === "all" || kindOf(a) === type);
  const [approving, setApproving] = useState<AgencyApplication | null>(null);
  const [rejecting, setRejecting] = useState<AgencyApplication | null>(null);
  const list = ofType.filter((a) => a.status === tab).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <AdminPage title="Applications" description="Requests to join from the website: agencies (/registro) and developers (/promotoras).">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as ApplicationStatus)}>
        <TabsList>
          {APPLICATION_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {LABEL[s]} <span className="text-muted-foreground tabular-nums">({ofType.filter((a) => a.status === s).length})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
        {/* Filter by type: the status counts follow it */}
        <div role="radiogroup" aria-label="Type" className="inline-flex rounded-md border p-0.5">
          {TYPE_FILTERS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={type === o.value}
              onClick={() => setType(o.value)}
              className={`min-h-9 rounded px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                type === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {tab === "pending" ? "No new applications. You're all caught up." : `No ${LABEL[tab].toLowerCase()} applications.`}
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => (
            <li key={a.id} className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex flex-wrap items-center gap-2 font-semibold">
                    {a.agencyName}
                    {kindOf(a) === "developer" ? (
                      <Badge variant="secondary" className="bg-info-soft text-info">
                        Developer
                      </Badge>
                    ) : (
                      <Badge variant="outline">Agency</Badge>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">Received {f.dateTime(a.createdAt)}</p>
                </div>
                {a.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setRejecting(a)}>
                      <X aria-hidden className="size-4" />
                      Reject
                    </Button>
                    <Button type="button" onClick={() => setApproving(a)}>
                      <Check aria-hidden className="size-4" />
                      Approve
                    </Button>
                  </div>
                ) : (
                  <Badge variant="secondary">
                    {LABEL[a.status]} {a.decidedAt && `· ${f.date(a.decidedAt)}`}
                  </Badge>
                )}
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted-foreground">Contact</dt><dd>{a.contactPerson}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted-foreground">Email</dt><dd className="min-w-0 truncate"><a href={`mailto:${a.email}`} className="hover:underline">{a.email}</a></dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted-foreground">Phone</dt><dd>{a.phone}</dd></div>
                {kindOf(a) === "agency" && <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted-foreground">Office</dt><dd>{a.town || "—"}</dd></div>}
                {!a.registration && (
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-muted-foreground">Areas</dt>
                    {/* Old applications have free text instead of regions */}
                    <dd>{a.regions.length ? a.regions.map((r) => to(`regions.${r}`)).join(", ") : a.areas || "—"}</dd>
                  </div>
                )}
                {(a.legalName || a.cif) && (
                  <div className="flex gap-2 sm:col-span-2">
                    <dt className="w-28 shrink-0 text-muted-foreground">Company</dt>
                    <dd>{[a.legalName, a.cif].filter(Boolean).join(" · ")}</dd>
                  </div>
                )}
                {kindOf(a) === "developer" ? <DeveloperRows a={a} /> : a.registration && <RegistrationRows r={a.registration} />}
                {(a.feedUrl || !a.registration) && (
                <div className="flex gap-2 sm:col-span-2">
                  <dt className="w-28 shrink-0 text-muted-foreground">{kindOf(a) === "developer" ? "Kyero feed" : "XML feed"}</dt>
                  <dd className="min-w-0">
                    {a.feedUrl ? (
                      <a href={a.feedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 hover:underline">
                        <span className="truncate">{a.feedUrl}</span>
                        <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                )}
                {a.rejectReason && (
                  <div className="flex gap-2 sm:col-span-2"><dt className="w-28 shrink-0 text-muted-foreground">Reason</dt><dd>{a.rejectReason}</dd></div>
                )}
                {a.agencyId && (
                  <div className="flex gap-2 sm:col-span-2">
                    <dt className="w-28 shrink-0 text-muted-foreground">Agency</dt>
                    <dd><Link href={ADMIN_ROUTES.agency(a.agencyId)} className="hover:underline">Open agency</Link></dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <ApproveDialog application={approving} onDecided={replace} onClose={() => setApproving(null)} />
      <RejectDialog application={rejecting} onDecided={replace} onClose={() => setRejecting(null)} />
    </AdminPage>
  );
}
