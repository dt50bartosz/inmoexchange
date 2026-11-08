"use client";

import { useState, useTransition } from "react";
import { KeyRound, LogOut, Mail, Repeat, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import SimpleSelect from "@/components/panel/SimpleSelect";
import LocalTime from "@/components/developers/LocalTime";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import type { Developer } from "@/types/developers";
import { sendLoginDetailsAction } from "@/app/[locale]/admin/agencies/[id]/server/actions";
import {
  changeLoginEmailAction,
  deleteDeveloperAction,
  removeFromCrmAction,
  setDeveloperStatusAction,
  signOutEverywhereAction,
} from "@/app/[locale]/admin/promotores/server/actions";
import ConfirmDialog from "../ui/ConfirmDialog";
import { loginEmailToast } from "../ui/loginEmailToast";
import { InfoCard, Row } from "./crm-ui";

type Confirm = null | "login" | "signOut" | "convert" | "delete" | "email";
const FAILED = "Something went wrong. Try again.";
const STATUS_OPTIONS = [
  { value: "active", label: "Active — can log in, published developments visible" },
  { value: "suspended", label: "Suspended — no login, developments hidden" },
  { value: "cancelled", label: "Cancelled — no login, developments hidden" },
];

/** Admin → developer → Account: login, access, status, convert and delete (= cancel when agencies registered clients). */
export default function AccountPanel({ developer: d, registrationCount }: { developer: Developer; registrationCount: number }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [email, setEmail] = useState(d.email);
  const [status, setStatus] = useState(d.accountStatus === "trial" ? "active" : d.accountStatus);
  const neverLoggedIn = d.status === "pending";
  const canHardDelete = registrationCount === 0;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn().catch(() => null);
      if (!res?.ok) return void toast.error(res?.error === "not_found" ? "This developer no longer exists." : res?.error === "email_taken" ? "Another account already uses that email." : FAILED);
      toast.success(done);
      if (after) after();
      else router.refresh();
    });

  const doConfirm = () => {
    if (confirm === "login")
      startTransition(async () => {
        const res = await sendLoginDetailsAction(d.id).catch(() => null);
        if (!res?.ok) toast.error(res?.error === "not_found" ? "This developer has no login." : FAILED);
        else {
          loginEmailToast(d.email, res.data);
          router.refresh();
        }
      });
    else if (confirm === "signOut") run(() => signOutEverywhereAction(d.id), "Signed out everywhere.");
    else if (confirm === "email") run(() => changeLoginEmailAction(d.id, { email }), `Login email changed to ${email}.`);
    else if (confirm === "convert") run(() => removeFromCrmAction(d.id), `${d.name} is a regular agency account again.`, () => router.push(ADMIN_ROUTES.developers));
    else if (confirm === "delete")
      startTransition(async () => {
        const res = await deleteDeveloperAction(d.id).catch(() => null);
        if (!res?.ok) return void toast.error(FAILED);
        toast.success(res.data.cancelled ? `${d.name} cancelled (kept because agencies registered clients).` : `${d.name} deleted.`);
        if (res.data.cancelled) router.refresh();
        else router.push(ADMIN_ROUTES.developers);
      });
    setConfirm(null);
  };

  const TEXT: Record<Exclude<Confirm, null>, { title: string; description: string; label: string; destructive?: boolean }> = {
    login: {
      title: neverLoggedIn ? `Send access to ${d.email}?` : `Send new login details to ${d.email}?`,
      description: "A new temporary password is emailed. Any current password stops working straight away; they choose a new one at their first login.",
      label: neverLoggedIn ? "Send access" : "Send login details",
    },
    signOut: { title: `Sign ${d.name} out everywhere?`, description: "Every open session ends. Their password doesn't change.", label: "Sign out everywhere" },
    email: {
      title: `Change the login email to ${email}?`,
      description: "They log in with the new email from now on (same password). Open sessions end.",
      label: "Change login email",
    },
    convert: {
      title: `Make ${d.name} a regular agency account?`,
      description: "Its login switches to the agency panel and open sessions end. Developments, units, registrations and history are kept and come back if you make it a developer again.",
      label: "Convert to agency",
    },
    delete: canHardDelete
      ? {
          title: `Delete ${d.name} permanently?`,
          description: "Removes the account, its login, developments, units, documents, contacts and notes. The update history is kept for the audit trail. It can't be undone.",
          label: "Delete permanently",
          destructive: true,
        }
      : {
          title: `Cancel ${d.name}?`,
          description: `Agencies have registered ${registrationCount} client${registrationCount === 1 ? "" : "s"} with this developer, so the account can't be deleted: it is cancelled instead (no login, developments hidden from agencies, everything kept).`,
          label: "Cancel account",
          destructive: true,
        },
  };
  const text = TEXT[confirm ?? "login"];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <InfoCard title="Login">
        <dl className="grid gap-1">
          <Row label="Login email" value={d.email || "—"} />
          <Row label="Last login" value={d.lastLoginAt ? <LocalTime iso={d.lastLoginAt} /> : "Never"} />
        </dl>
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim().toLowerCase() !== d.email) setConfirm("email");
          }}
        >
          <label className="grid min-w-56 flex-1 gap-1.5 text-sm font-medium">
            New login email
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </label>
          <Button type="submit" variant="outline" disabled={busy || email.trim().toLowerCase() === d.email}>
            Change
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm("login")}>
            {neverLoggedIn ? <Mail aria-hidden className="size-4" /> : <KeyRound aria-hidden className="size-4" />}
            {neverLoggedIn ? "Send access" : "Send login details"}
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm("signOut")}>
            <LogOut aria-hidden className="size-4" />
            Sign out everywhere
          </Button>
        </div>
        {neverLoggedIn && <p className="mt-3 text-sm text-muted-foreground">They have never logged in. Prepare their developments as drafts first, then send access.</p>}
      </InfoCard>

      <InfoCard title="Status">
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-64 flex-1 gap-1.5 text-sm font-medium">
            Account status
            <SimpleSelect value={status} onChange={(v) => setStatus(v as typeof status)} options={STATUS_OPTIONS} />
          </label>
          <Button
            type="button"
            disabled={busy || status === (d.accountStatus === "trial" ? "active" : d.accountStatus)}
            onClick={() => run(() => setDeveloperStatusAction(d.id, status), `Status set to ${status}.`)}
          >
            Save status
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Nothing is deleted by suspending or cancelling. Reactivate any time.</p>
      </InfoCard>

      <InfoCard title="Account type and removal">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm("convert")}>
            <Repeat aria-hidden className="size-4" />
            Convert to agency
          </Button>
          <Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={() => setConfirm("delete")}>
            {canHardDelete ? <Trash2 aria-hidden className="size-4" /> : <ShieldOff aria-hidden className="size-4" />}
            {canHardDelete ? "Delete permanently" : "Cancel account"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {canHardDelete
            ? "No agency has registered clients with this developer, so it can be deleted permanently."
            : `${registrationCount} client registration${registrationCount === 1 ? "" : "s"} by agencies: the account can only be cancelled, never deleted.`}
        </p>
      </InfoCard>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={text.title}
        description={text.description}
        confirmLabel={text.label}
        destructive={!!text.destructive}
        onConfirm={doConfirm}
      />
    </div>
  );
}
