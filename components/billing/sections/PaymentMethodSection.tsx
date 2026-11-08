"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PanelSection from "@/components/panel/PanelSection";
import FormField from "@/components/panel/FormField";
import { cardFormSchema as schema } from "@/lib/schemas/billing";
import { wait } from "@/components/panel/mock";
import type { Card } from "../types";

/*
 * FRONT-END MOCK ONLY.
 * Before going live, replace this card form with Stripe's card element (or Stripe Checkout /
 * Customer Portal). Card numbers must never reach your own server. Only brand, last4 and expiry
 * come back from Stripe and are shown here.
 */

const digits = (v: string) => v.replace(/\D/g, "");


const detectBrand = (num: string) =>
  /^4/.test(num) ? "Visa" : /^(5[1-5]|2[2-7])/.test(num) ? "Mastercard" : /^3[47]/.test(num) ? "American Express" : "Card";
const formatNumber = (v: string) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
const formatExpiry = (v: string) => {
  const d = digits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

const EMPTY = { holder: "", number: "", expiry: "", cvc: "" };

type Props = { card: Card | null; onChange: (card: Card) => void };

export default function PaymentMethodSection({ card, onChange }: Props) {
  const t = useTranslations("panel.billing.card");
  const [open, setOpen] = useState(false);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY, mode: "onTouched" });
  const { register, handleSubmit, formState, reset, setValue } = form;
  const e = formState.errors;

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) reset(EMPTY);
  };

  const save = handleSubmit(async (v) => {
    await wait(); // TODO backend: handled by Stripe, see the note at the top of this file
    const num = digits(v.number);
    const [mm, yy] = v.expiry.split("/").map(Number);
    onChange({ brand: detectBrand(num), last4: num.slice(-4), expMonth: mm, expYear: 2000 + yy, holder: v.holder.trim() });
    close(false);
    toast.success(t("updated"));
  });

  return (
    <PanelSection title={t("title")} description={t("description")}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        {card ? (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-14 items-center justify-center rounded border bg-muted">
              <CreditCard aria-hidden className="size-4 text-muted-foreground" />
            </span>
            <div className="text-sm">
              <p className="font-medium">{t("ending", { brand: card.brand, last4: card.last4 })}</p>
              <p className="text-muted-foreground">
                {t("expires", { date: `${String(card.expMonth).padStart(2, "0")}/${card.expYear}`, holder: card.holder })}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("none")}</p>
        )}
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          {card ? t("update") : t("add")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => !formState.isSubmitting && close(o)}>
        <DialogContent className="sm:max-w-md">
          <form noValidate onSubmit={save} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{card ? t("update") : t("add")}</DialogTitle>
              <DialogDescription>{t("dialogDescription")}</DialogDescription>
            </DialogHeader>
            <FormField label={t("holder")} required error={e.holder?.message}>
              {(p) => <Input {...p} autoComplete="cc-name" {...register("holder")} />}
            </FormField>
            <FormField label={t("number")} required error={e.number?.message}>
              {(p) => (
                <Input
                  {...p}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 5678 9012 3456"
                  {...register("number", { onChange: (ev) => setValue("number", formatNumber(ev.target.value)) })}
                />
              )}
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("expiry")} required error={e.expiry?.message}>
                {(p) => (
                  <Input
                    {...p}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder={t("expiryPlaceholder")}
                    {...register("expiry", { onChange: (ev) => setValue("expiry", formatExpiry(ev.target.value)) })}
                  />
                )}
              </FormField>
              <FormField label="CVC" required error={e.cvc?.message}>
                {(p) => (
                  <Input
                    {...p}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={4}
                    {...register("cvc", { onChange: (ev) => setValue("cvc", digits(ev.target.value)) })}
                  />
                )}
              </FormField>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)} disabled={formState.isSubmitting}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PanelSection>
  );
}
