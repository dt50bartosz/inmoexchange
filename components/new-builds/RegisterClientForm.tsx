"use client";

import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/panel/FormField";
import { clientRegistrationSchema } from "@/lib/schemas/client-registrations";
import type { CreateRegistrationResult } from "@/lib/server/developer/registrations";
import type { z } from "zod";

type Values = z.input<typeof clientRegistrationSchema>;

type Props = {
  developmentId: string;
  protectionDays: number;
  /** Server action bound to the development. */
  register: (values: Values) => Promise<CreateRegistrationResult>;
};

/** Obra nueva → Registrar cliente. Phone or email lets the developer's system recognise the buyer; the developer only sees the name. */
export default function RegisterClientForm({ developmentId, protectionDays, register: send }: Props) {
  const t = useTranslations("newBuilds.register");
  const router = useRouter();
  const empty: Values = { developmentId, buyerName: "", buyerPhone: "", buyerEmail: "", notes: "" };
  const form = useForm<Values>({ resolver: zodResolver(clientRegistrationSchema), defaultValues: empty, mode: "onTouched" });
  const { register, handleSubmit, formState, reset, setError } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit(async (values) => {
    const res = await send(values).catch(() => null);
    if (!res?.ok) {
      if (res?.error === "validation_error" && res.fieldErrors) {
        for (const [field, message] of Object.entries(res.fieldErrors)) setError(field as FieldPath<Values>, { type: "server", message });
      }
      toast.error(t(`errors.${res?.error ?? "generic"}`));
      return;
    }
    toast.success(t("sent"));
    reset(empty);
    router.refresh();
  });

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t("intro", { days: protectionDays })}</p>
      <FormField label={t("name")} required error={e.buyerName?.message}>
        {(p) => <Input {...p} autoComplete="off" {...register("buyerName")} />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("phone")} error={e.buyerPhone?.message}>
          {(p) => <Input {...p} type="tel" autoComplete="off" {...register("buyerPhone")} />}
        </FormField>
        <FormField label={t("email")} error={e.buyerEmail?.message}>
          {(p) => <Input {...p} type="email" autoComplete="off" {...register("buyerEmail")} />}
        </FormField>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">{t("contactHint")}</p>
      <FormField label={t("notes")} hint={t("optional")} error={e.notes?.message}>
        {(p) => <Textarea {...p} rows={3} placeholder={t("notesPlaceholder")} {...register("notes")} />}
      </FormField>
      <div>
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t("sending") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
