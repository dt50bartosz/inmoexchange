"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PanelSection from "@/components/panel/PanelSection";
import { wait } from "@/components/panel/mock";
import { daysUntil, useBillingFormat, withVat } from "../useBillingFormat";
import { PLAN_FEATURE_KEYS, type Subscription, type SubscriptionStatus } from "../types";

const STATUS_CLASS: Record<SubscriptionStatus, string> = {
  active: "bg-success-soft text-success",
  trialing: "bg-warning-soft text-warning",
  past_due: "bg-destructive/10 text-destructive",
  canceled: "bg-muted text-muted-foreground",
};

type Props = { subscription: Subscription; onChange: (s: Subscription) => void };

export default function SubscriptionSection({ subscription: sub, onChange }: Props) {
  const t = useTranslations("panel.billing.subscription");
  const f = useBillingFormat();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const vat = Math.round(sub.vatRate * 100);
  const total = f.money(withVat(sub.priceCents, sub.vatRate), sub.currency);
  const end = f.date(sub.currentPeriodEnd);

  const cancel = async () => {
    setBusy(true);
    await wait(800); // TODO backend: POST /api/billing/cancel (cancel at period end)
    onChange({ ...sub, status: "canceled" });
    setBusy(false);
    setConfirm(false);
    toast.success(t("cancelled", { date: end }));
  };

  const resume = async () => {
    setBusy(true);
    await wait(800); // TODO backend: POST /api/billing/resume
    onChange({ ...sub, status: "active" });
    setBusy(false);
    toast.success(t("resumed"));
  };

  return (
    <PanelSection title={t("title")} description={t("description")}>
      <div className="rounded-lg border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{t("planName")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {f.money(sub.priceCents, sub.currency)}
              <span className="text-sm font-normal text-muted-foreground"> {t("perMonth", { vat })}</span>
            </p>
          </div>
          <Badge variant="secondary" className={STATUS_CLASS[sub.status]}>
            {t(`statuses.${sub.status}`)}
          </Badge>
        </div>

        <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {PLAN_FEATURE_KEYS.map((k) => (
            <li key={k} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
              {t(`features.${k}`)}
            </li>
          ))}
        </ul>

        <dl className="mt-5 grid gap-1 border-t pt-4 text-sm">
          {sub.status === "trialing" && sub.trialEnd && (
            <Row label={t("trialEnds")} value={t("trialEndsValue", { date: f.date(sub.trialEnd), days: daysUntil(sub.trialEnd), total })} />
          )}
          {(sub.status === "active" || sub.status === "past_due") && (
            <Row label={t("nextPayment")} value={t("nextPaymentValue", { date: end, total })} />
          )}
          {sub.status === "canceled" && <Row label={t("accessUntil")} value={end} />}
        </dl>
      </div>

      {sub.status === "past_due" && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{t("pastDueNote")}</p>
      )}
      {sub.status === "canceled" && (
        <p className="mt-4 rounded-lg border bg-muted p-3 text-sm text-muted-foreground">{t("canceledNote", { date: end })}</p>
      )}

      <div className="mt-4">
        {sub.status === "canceled" ? (
          <Button type="button" onClick={resume} disabled={busy}>
            {busy ? t("resuming") : t("resume")}
          </Button>
        ) : (
          <Button type="button" variant="outline" className="text-destructive" onClick={() => setConfirm(true)} disabled={busy}>
            {t("cancel")}
          </Button>
        )}
      </div>

      <AlertDialog open={confirm} onOpenChange={(o) => !busy && setConfirm(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cancelBody", { date: end })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("keep")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={cancel} disabled={busy}>
              {busy ? t("cancelling") : t("cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PanelSection>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
