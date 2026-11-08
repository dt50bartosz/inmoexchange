"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import LocationInput from "@/components/panel/LocationInput";
import FormField from "@/components/panel/FormField";
import ChipGroup from "@/components/panel/ChipGroup";
import SimpleSelect from "@/components/panel/SimpleSelect";
import PanelSection from "@/components/panel/PanelSection";
import { REGION_KEYS } from "@/lib/constants/options";
import { EMPTY_COMPANY_PROFILE, PROFILE_DESCRIPTION_MAX } from "@/lib/schemas/developer-profile";
import type { AdminOption, DeveloperProfileValues } from "@/types/developers";

export const EMPTY_DEVELOPER: DeveloperProfileValues = { ...EMPTY_COMPANY_PROFILE, relationshipManagerId: "" };

type Props = { form: UseFormReturn<DeveloperProfileValues>; admins: AdminOption[] };

/** Company, about, contact and CRM fields of Add developer (Edit uses the developer's own profile form). */
export default function DeveloperFields({ form, admins }: Props) {
  const to = useTranslations("panel.options");
  const { register, control, formState } = form;
  const e = formState.errors;
  const opt = "Optional";

  return (
    <>
      <PanelSection title="Company" description="As it appears on the platform and in contracts.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Developer / company name" required error={e.name?.message}>
            {(p) => <Input {...p} {...register("name")} autoComplete="off" />}
          </FormField>
          <FormField label="Legal name" hint={opt} error={e.legalName?.message}>
            {(p) => <Input {...p} {...register("legalName")} />}
          </FormField>
          <FormField label="Company registration number (CIF)" hint={opt} error={e.cif?.message}>
            {(p) => <Input {...p} className="uppercase" {...register("cif")} />}
          </FormField>
          <FormField label="Website" hint={opt} error={e.website?.message}>
            {(p) => <Input {...p} type="url" placeholder="https://" {...register("website")} />}
          </FormField>
        </div>
      </PanelSection>

      <PanelSection title="About the developer" description="Shown to agencies on its developments. The developer can change it in its profile.">
        <div className="grid gap-4">
          {(["es", "en"] as const).map((lang) => (
            <FormField key={lang} label={lang === "es" ? "Description (Spanish)" : "Description (English)"} hint={opt} error={e.description?.[lang]?.message}>
              {(p) => <Textarea {...p} lang={lang} rows={4} maxLength={PROFILE_DESCRIPTION_MAX} {...register(`description.${lang}`)} />}
            </FormField>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Main contact" description="The person you speak to at the developer.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Contact person" hint={opt} error={e.contactPerson?.message}>
            {(p) => <Input {...p} {...register("contactPerson")} autoComplete="off" />}
          </FormField>
          <FormField label="Position" hint={opt} error={e.contactPosition?.message}>
            {(p) => <Input {...p} placeholder="Sales director" {...register("contactPosition")} />}
          </FormField>
          <FormField label="Contact email" hint={opt} error={e.contactEmail?.message}>
            {(p) => <Input {...p} type="email" {...register("contactEmail")} autoComplete="off" />}
          </FormField>
          <FormField label="Phone" hint={opt} error={e.phone?.message}>
            {(p) => <Input {...p} type="tel" {...register("phone")} autoComplete="off" />}
          </FormField>
        </div>
      </PanelSection>

      <PanelSection title="Address" description="The company's office.">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Street" hint={opt} error={e.street?.message} className="sm:col-span-2">
            {(p) => <Input {...p} {...register("street")} />}
          </FormField>
          <FormField label="City / town" hint={opt} error={e.town?.message}>
            {(p) => <Controller control={control} name="town" render={({ field }) => <LocationInput {...p} value={field.value ?? ""} onChange={(text) => field.onChange(text)} />} />}
          </FormField>
          <FormField label="Postcode" hint={opt} error={e.postcode?.message}>
            {(p) => <Input {...p} {...register("postcode")} />}
          </FormField>
          <FormField label="Province" hint={opt} error={e.province?.message}>
            {(p) => <Input {...p} {...register("province")} />}
          </FormField>
          <FormField label="Country" hint={opt} error={e.country?.message}>
            {(p) => <Input {...p} {...register("country")} />}
          </FormField>
        </div>
      </PanelSection>

      <PanelSection title="CRM" description="Internal: the developer never sees these.">
        <div className="grid gap-4">
          <FormField label="Relationship manager" hint={opt} error={e.relationshipManagerId?.message}>
            {(p) => (
              <Controller
                control={control}
                name="relationshipManagerId"
                render={({ field }) => (
                  <SimpleSelect {...p} value={field.value || "none"} onChange={(v) => field.onChange(v === "none" ? "" : v)} options={[{ value: "none", label: "Nobody yet" }, ...admins.map((a) => ({ value: a.id, label: a.email }))]} />
                )}
              />
            )}
          </FormField>
          <Controller
            control={control}
            name="regions"
            render={({ field }) => (
              <ChipGroup legend="Areas they build in" options={REGION_KEYS.map((r) => ({ value: r, label: to(`regions.${r}`) }))} selected={field.value ?? []} onChange={field.onChange} error={e.regions?.message} />
            )}
          />
        </div>
      </PanelSection>
    </>
  );
}
