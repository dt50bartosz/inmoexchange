"use client";

import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import PanelSection from "@/components/panel/PanelSection";
import FormField from "@/components/panel/FormField";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { focusFirstInvalid, wait } from "@/components/panel/mock";
import { COUNTRIES, billingDetailsSchema as schema, type BillingDetails } from "@/lib/schemas/billing";


type Props = { details: BillingDetails; onSave: (d: BillingDetails) => void };

export default function BillingDetailsSection({ details, onSave }: Props) {
  const t = useTranslations("panel.billing.details");
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: details, mode: "onTouched" });
  const { register, control, handleSubmit, formState, reset } = form;
  const e = formState.errors;

  const submit = handleSubmit(
    async (values) => {
      await wait(); // TODO backend: PATCH /api/billing/details
      onSave(values);
      reset(values);
      toast.success(t("saved"));
    },
    () => focusFirstInvalid(formRef.current)
  );

  return (
    <PanelSection title={t("title")} description={t("description")}>
      <form ref={formRef} noValidate onSubmit={submit} className="grid gap-4 sm:grid-cols-6">
        <FormField label={t("legalName")} required error={e.legalName?.message} className="sm:col-span-4">
          {(p) => <Input {...p} {...register("legalName")} />}
        </FormField>
        <FormField label={t("taxId")} required error={e.taxId?.message} className="sm:col-span-2">
          {(p) => <Input {...p} className="uppercase" {...register("taxId", { setValueAs: (v: string) => v.toUpperCase() })} />}
        </FormField>
        <FormField label={t("street")} required error={e.street?.message} className="sm:col-span-6">
          {(p) => <Input {...p} autoComplete="street-address" {...register("street")} />}
        </FormField>
        <FormField label={t("town")} required error={e.town?.message} className="sm:col-span-2">
          {(p) => <Input {...p} {...register("town")} />}
        </FormField>
        <FormField label={t("postcode")} required error={e.postcode?.message} className="sm:col-span-2">
          {(p) => <Input {...p} autoComplete="postal-code" {...register("postcode")} />}
        </FormField>
        <FormField label={t("province")} className="sm:col-span-2">
          {(p) => <Input {...p} {...register("province")} />}
        </FormField>
        <FormField label={t("country")} className="sm:col-span-3">
          {(p) => (
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <SimpleSelect
                  {...p}
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  options={COUNTRIES.map((c) => ({ value: c, label: t(`countries.${c}`) }))}
                />
              )}
            />
          )}
        </FormField>
        <FormField label={t("invoiceEmail")} required error={e.invoiceEmail?.message} className="sm:col-span-6">
          {(p) => <Input {...p} type="email" {...register("invoiceEmail")} />}
        </FormField>
        <div className="flex flex-wrap gap-2 sm:col-span-6">
          <Button type="submit" disabled={!formState.isDirty || formState.isSubmitting}>
            {formState.isSubmitting ? t("saving") : t("save")}
          </Button>
          {formState.isDirty && (
            <Button type="button" variant="outline" onClick={() => reset()} disabled={formState.isSubmitting}>
              {t("discard")}
            </Button>
          )}
        </div>
      </form>
    </PanelSection>
  );
}
