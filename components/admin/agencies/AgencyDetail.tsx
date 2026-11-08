"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Ban, KeyRound, Mail, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { usePropertyFormat } from "@/components/properties/usePropertyFormat";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import AdminPage from "../ui/AdminPage";
import AgencyStatusBadge from "../ui/AgencyStatusBadge";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useAdminFormat } from "../ui/useAdminFormat";
import type { AdminAgency, AdminFeed, AdminProperty } from "@/types/admin";
import type { PropertyStatsSummary } from "@/types/property-events";
import type { AgencyStatus } from "@/lib/constants/admin";
import { deleteAgencyAction, sendLoginDetailsAction, setAgencyStatusAction } from "@/app/[locale]/admin/agencies/[id]/server/actions";
import { loginEmailToast } from "../ui/loginEmailToast";

type Confirm = null | "suspend" | "delete" | "login";

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-2 py-1 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value || "—"}</dd>
    </div>
  );
}

type Props = {
  agency: AdminAgency | null;
  feeds: AdminFeed[];
  properties: AdminProperty[];
  /** Views and WhatsApp clicks of all the agency's properties (read-only). */
  stats: PropertyStatsSummary[string];
};

const FAILED = "Something went wrong. Try again.";

export default function AgencyDetail({ agency, feeds, properties, stats }: Props) {
  const router = useRouter();
  const to = useTranslations("panel.options");
  const fp = usePropertyFormat();
  const f = useAdminFormat();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, startTransition] = useTransition();

  const back = (
    <Link href={ADMIN_ROUTES.agencies} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft aria-hidden className="size-4" />
      Agencies
    </Link>
  );

  if (!agency) {
    return (
      <AdminPage title="Agency not found" description="It may have been deleted." back={back}>
        <Link href={ADMIN_ROUTES.agencies} className={buttonVariants({ variant: "outline" })}>
          Back to agencies
        </Link>
      </AdminPage>
    );
  }

  const active = properties.filter((p) => p.status === "active" && !p.hidden && !p.moderation).length;
  const isSuspended = agency.status === "suspended";

  const changeStatus = (status: AgencyStatus, done: string) =>
    startTransition(async () => {
      const res = await setAgencyStatusAction(agency.id, status).catch(() => null);
      if (res?.ok) {
        toast.success(done);
        router.refresh(); // reload the page's data so the new status shows
      } else toast.error(res?.error === "not_found" ? "This agency no longer exists." : FAILED);
    });

  const remove = () =>
    startTransition(async () => {
      const res = await deleteAgencyAction(agency.id).catch(() => null);
      if (!res?.ok) {
        toast.error(res?.error === "not_found" ? "This agency no longer exists." : FAILED);
        return;
      }
      toast.success(`${agency.name} deleted.`);
      router.push(ADMIN_ROUTES.agencies);
    });

  const sendLogin = () =>
    startTransition(async () => {
      const res = await sendLoginDetailsAction(agency.id).catch(() => null);
      if (!res?.ok) {
        toast.error(res?.error === "not_found" ? "This agency has no login." : FAILED);
        return;
      }
      loginEmailToast(agency.email, res.data);
      router.refresh();
    });

  const doConfirm = () => {
    if (confirm === "suspend") changeStatus("suspended", `${agency.name} suspended.`);
    else if (confirm === "delete") remove();
    else if (confirm === "login") sendLogin();
    setConfirm(null);
  };

  const CONFIRM_TEXT = {
    suspend: {
      title: `Suspend ${agency.name}?`,
      description: "They won't be able to log in, and their properties are hidden from the network until you reactivate them.",
      label: "Suspend agency",
    },
    delete: {
      title: `Delete ${agency.name}?`,
      description: "This permanently removes the agency, its login, properties, feeds, CRM and client microsites. It can't be undone.",
      label: "Delete agency",
    },
    login: {
      title: `Send new login details to ${agency.email}?`,
      description: "A new temporary password is emailed to the agency. Their current password stops working straight away, and they choose a new one when they log in.",
      label: "Send login details",
    },
  } as const;
  const confirmText = confirm ? CONFIRM_TEXT[confirm] : CONFIRM_TEXT.suspend;

  return (
    <AdminPage
      title={agency.name}
      description={`${agency.town || "No town"} · joined ${f.date(agency.createdAt)}`}
      back={back}
      actions={
        <>
          {isSuspended ? (
            <Button type="button" disabled={busy} onClick={() => changeStatus("active", `${agency.name} reactivated.`)}>
              <Play aria-hidden className="size-4" />
              Reactivate
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm("suspend")}>
              <Ban aria-hidden className="size-4" />
              Suspend
            </Button>
          )}
          <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm("login")}>
            {agency.invitePending ? <Mail aria-hidden className="size-4" /> : <KeyRound aria-hidden className="size-4" />}
            Send login details
          </Button>
          <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={() => setConfirm("delete")}>
            <Trash2 aria-hidden className="size-4" />
            Delete
          </Button>
        </>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <AgencyStatusBadge status={agency.status} />
        {agency.invitePending && <Badge variant="outline">Not logged in yet</Badge>}
        {isSuspended && <p className="text-sm text-muted-foreground">They can't log in, and their properties are hidden from the network.</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Profile">
          <dl>
            <Row label="Contact person" value={agency.contactPerson} />
            <Row label="Login email" value={<a href={`mailto:${agency.email}`} className="hover:underline">{agency.email}</a>} />
            <Row label="Phone" value={agency.phone} />
            <Row label="Legal name" value={agency.legalName} />
            <Row label="CIF / NIF" value={agency.cif} />
            <Row label="Areas" value={agency.regions.map((r) => to(`regions.${r}`)).join(", ")} />
            <Row label="Last login" value={agency.lastLoginAt ? f.dateTime(agency.lastLoginAt) : "Never"} />
          </dl>
        </Card>

        <Card title="Registration">
          <dl>
            <Row label="Address" value={agency.registration.address} />
            <Row label="Website" value={agency.registration.website} />
            <Row label="RAICV" value={agency.registration.raicv} />
            <Row label="CEO / owner" value={[agency.registration.ownerName, agency.registration.ownerIdNumber].filter(Boolean).join(" · ")} />
            <Row label="More contact" value={[agency.registration.phone2, agency.registration.email2].filter(Boolean).join(" · ")} />
            <Row label="CRM" value={[agency.registration.crm, agency.registration.crmAgencyNumber && `nº ${agency.registration.crmAgencyNumber}`].filter(Boolean).join(" · ")} />
            <Row label="Payment" value={[agency.registration.paymentFrequency, agency.registration.iban].filter(Boolean).join(" · ")} />
            <Row label="Language" value={{ en: "English", es: "Spanish" }[agency.registration.preferredLanguage] ?? ""} />
            <Row label="Privacy accepted" value={agency.registration.privacyAcceptedAt ? f.dateTime(agency.registration.privacyAcceptedAt) : ""} />
          </dl>
        </Card>

        <Card title="Numbers">
          <dl>
            <Row label="Active on network" value={<span className="tabular-nums">{active}</span>} />
            <Row label="All properties" value={<span className="tabular-nums">{properties.length}</span>} />
            <Row label="Hidden by admin" value={<span className="tabular-nums">{properties.filter((p) => p.moderation).length}</span>} />
            <Row label="Views (30 days / all time)" value={<span className="tabular-nums">{stats.views30} / {stats.views}</span>} />
            <Row label="WhatsApp clicks (30 days / all time)" value={<span className="tabular-nums">{stats.whatsapp30} / {stats.whatsapp}</span>} />
            <Row label="XML feeds" value={<span className="tabular-nums">{feeds.length}</span>} />
            <Row label="Feeds with errors" value={<span className="tabular-nums">{feeds.filter((x) => x.status === "error").length}</span>} />
          </dl>
        </Card>

        <Card title="XML feeds" action={<Link href={ADMIN_ROUTES.feeds} className="text-sm text-muted-foreground hover:text-foreground">All feeds</Link>}>
          {feeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feeds. Properties are added by hand.</p>
          ) : (
            <ul className="divide-y text-sm">
              {feeds.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{x.name}</span>
                  <Badge variant="secondary" className={x.status === "error" ? "bg-destructive/10 text-destructive" : undefined}>
                    {x.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Latest properties" action={<Link href={`${ADMIN_ROUTES.properties}?agency=${agency.id}`} className="text-sm text-muted-foreground hover:text-foreground">All properties</Link>}>
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No properties yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {[...properties].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">
                    {fp.title(p)} <span className="text-muted-foreground">· {p.code}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{fp.price(p.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirmText.title}
        description={confirmText.description}
        confirmLabel={confirmText.label}
        destructive={confirm !== "login"}
        onConfirm={doConfirm}
      />
    </AdminPage>
  );
}
