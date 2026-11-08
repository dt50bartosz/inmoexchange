"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import LocationInput from "@/components/panel/LocationInput";
import FormField from "@/components/panel/FormField";
import ChipGroup from "@/components/panel/ChipGroup";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { REGION_KEYS } from "@/lib/constants/options";
import type { AddAgencyValues } from "@/types/admin";

type Props = { form: UseFormReturn<AddAgencyValues>; compact?: boolean };

/** Agency fields shared by "Add agency" and "Approve application". */
export default function AgencyFields({ form, compact }: Props) {
  const to = useTranslations("panel.options");
  const { register, control, formState } = form;
  const e = formState.errors;

  return (
    <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2"}`}>
      <FormField label="Agency name" required error={e.name?.message}>
        {(p) => <Input {...p} {...register("name")} autoComplete="off" />}
      </FormField>
      <FormField label="Contact person" required error={e.contactPerson?.message}>
        {(p) => <Input {...p} {...register("contactPerson")} autoComplete="off" />}
      </FormField>
      <FormField label="Login email" hint="Login details are emailed here" required error={e.email?.message}>
        {(p) => <Input {...p} type="email" {...register("email")} autoComplete="off" />}
      </FormField>
      <FormField label="Phone / WhatsApp" required error={e.phone?.message}>
        {(p) => <Input {...p} type="tel" {...register("phone")} autoComplete="off" />}
      </FormField>
      {!compact && (
        <>
          <FormField label="Legal name" hint="Optional" error={e.legalName?.message}>
            {(p) => <Input {...p} {...register("legalName")} />}
          </FormField>
          <FormField label="CIF / NIF" hint="Optional" error={e.cif?.message}>
            {(p) => <Input {...p} className="uppercase" {...register("cif")} />}
          </FormField>
        </>
      )}
      <FormField label="Town" hint="Optional">
        {(p) => (
            <Controller
              control={control}
              name="town"
              render={({ field }) => <LocationInput {...p} value={field.value ?? ""} onChange={(text) => field.onChange(text)} />}
            />
          )}
      </FormField>
      <FormField label="Account status">
        {(p) => (
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <SimpleSelect
                {...p}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "trial", label: "Trial" },
                  { value: "active", label: "Active" },
                ]}
              />
            )}
          />
        )}
      </FormField>
      <div className={compact ? "" : "sm:col-span-2"}>
        <Controller
          control={control}
          name="regions"
          render={({ field }) => (
            <ChipGroup
              legend="Areas they work in *"
              options={REGION_KEYS.map((r) => ({ value: r, label: to(`regions.${r}`) }))}
              selected={field.value}
              onChange={(next) => field.onChange(next as typeof field.value)}
              error={e.regions?.message}
            />
          )}
        />
      </div>
      <FormField label="XML feed URL" hint="Optional. Starts importing straight away" error={e.feedUrl?.message} className={compact ? "" : "sm:col-span-2"}>
        {(p) => <Input {...p} type="url" placeholder="https://" {...register("feedUrl")} />}
      </FormField>
    </div>
  );
}

export const EMPTY_AGENCY: AddAgencyValues = {
  name: "",
  legalName: "",
  cif: "",
  contactPerson: "",
  email: "",
  phone: "",
  town: "",
  regions: [],
  status: "trial",
  feedUrl: "",
};
