"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DecideRegistrationResult } from "@/lib/server/developer/registrations";
import type { DeveloperRegistration } from "@/types/developers";

/** Pendiente / Protegido hasta … / Protección vencida / Rechazado — always words, not colour alone. */
export function RegistrationStatusBadge({ r }: { r: DeveloperRegistration }) {
  const t = useTranslations("registrations.status");
  const format = useFormatter();
  if (r.status === "pending") return <span className="inline-flex rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">{t("pending")}</span>;
  if (r.status === "rejected") return <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{t("rejected")}</span>;
  return r.protectionActive ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
      <ShieldCheck aria-hidden className="size-3.5" />
      {t("protectedUntil", { date: format.dateTime(new Date(r.protectedUntil!), { dateStyle: "medium" }) })}
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{t("expired")}</span>
  );
}

type Props = {
  registrations: DeveloperRegistration[];
  /** A server action; the developer (or the admin's developer) is fixed on the server. */
  decide: (registrationId: string, input: { decision: "accept" | "reject"; reason: string }) => Promise<DecideRegistrationResult>;
  /** Show the development's name in each row (off on a single development's list). */
  showDevelopment?: boolean;
};

/** Agencies' client registrations: buyer name, agency, development, date, and accept / reject for pending ones. */
export default function RegistrationsList({ registrations, decide, showDevelopment = true }: Props) {
  const t = useTranslations("registrations");
  const format = useFormatter();
  const router = useRouter();
  const [deciding, setDeciding] = useState<{ r: DeveloperRegistration; decision: "accept" | "reject" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const open = (r: DeveloperRegistration, decision: "accept" | "reject") => {
    setReason("");
    setDeciding({ r, decision });
  };

  const submit = async () => {
    if (!deciding) return;
    setBusy(true);
    const res = await decide(deciding.r.id, { decision: deciding.decision, reason }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      toast.error(res ? t(`errors.${res.error === "validation_error" ? "generic" : res.error}`) : t("errors.generic"));
      if (res && res.error !== "validation_error") setDeciding(null);
      router.refresh();
      return;
    }
    toast.success(deciding.decision === "accept" ? t("accepted") : t("rejected"));
    setDeciding(null);
    router.refresh();
  };

  if (registrations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-10 text-center">
        <p className="font-medium">{t("empty")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y rounded-xl border bg-card">
        {registrations.map((r) => (
          <li key={r.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{r.buyerName}</p>
                <RegistrationStatusBadge r={r} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("line", { agency: r.agencyName, date: format.dateTime(new Date(r.createdAt), { dateStyle: "medium" }) })}
                {showDevelopment && <> · {r.developmentName}</>}
              </p>
              {r.notes && <p className="mt-1 whitespace-pre-line text-sm">{r.notes}</p>}
              {r.status === "rejected" && r.reason && (
                <p className="mt-1 text-sm text-muted-foreground">{r.reason === "protected_other" ? t("autoRejected") : t("reasonLine", { reason: r.reason })}</p>
              )}
            </div>
            {r.status === "pending" && (
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => open(r, "accept")}>
                  <Check aria-hidden className="size-4" />
                  {t("accept")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => open(r, "reject")}>
                  <X aria-hidden className="size-4" />
                  {t("reject")}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={!!deciding} onOpenChange={(o) => !o && setDeciding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{deciding?.decision === "accept" ? t("acceptTitle", { name: deciding.r.buyerName }) : t("rejectTitle", { name: deciding?.r.buyerName ?? "" })}</DialogTitle>
            <DialogDescription>
              {deciding?.decision === "accept" ? t("acceptBody", { agency: deciding.r.agencyName }) : t("rejectBody", { agency: deciding?.r.agencyName ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm font-medium">
            {t("reasonLabel")}
            <Textarea value={reason} maxLength={500} rows={3} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeciding(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" disabled={busy} variant={deciding?.decision === "reject" ? "destructive" : "default"} onClick={submit}>
              {deciding?.decision === "accept" ? t("accept") : t("reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
