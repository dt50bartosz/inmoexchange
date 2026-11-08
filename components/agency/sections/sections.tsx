"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import LocationInput from "@/components/panel/LocationInput";
import PanelSection from "@/components/panel/PanelSection";
import FormField from "@/components/panel/FormField";
import ChipGroup from "@/components/panel/ChipGroup";
import LanguageTabsEditor from "@/components/panel/LanguageTabsEditor";
import type { LangCode } from "@/lib/constants/languages";
import { REGION_KEYS, SPOKEN_LANGUAGE_KEYS } from "@/lib/constants/options";
import LogoUpload from "../LogoUpload";
import { ABOUT_MAX } from "@/lib/constants/agency";
import type { Agency, AgencyFormValues } from "@/lib/schemas/agency";

export type AgencySectionProps = { form: UseFormReturn<AgencyFormValues, unknown, Agency> };

/* ---------- Logo and name ---------- */

export function BrandingSection({ form, onLogoFile }: AgencySectionProps & { onLogoFile: (f: File | null) => void }) {
  const t = useTranslations("panel.agency");
  const { register, control, formState, watch } = form;
  return (
    <PanelSection title={t("branding.title")} description={t("branding.description")}>
      <div className="space-y-5">
        <Controller
          control={control}
          name="logoUrl"
          render={({ field }) => (
            <LogoUpload
              logoUrl={field.value}
              agencyName={watch("name")}
              onChange={(url, file) => {
                field.onChange(url);
                onLogoFile(file);
              }}
            />
          )}
        />
        <FormField label={t("branding.name")} required error={formState.errors.name?.message}>
          {(p) => <Input {...p} {...register("name")} />}
        </FormField>
      </div>
    </PanelSection>
  );
}

/* ---------- About page (client microsite, multi-language) ---------- */

export function AboutSection({ form }: AgencySectionProps) {
  const t = useTranslations("panel.agency.about");
  const { control, formState, setValue, watch } = form;
  const aboutErrors = formState.errors.about as Partial<Record<LangCode, { message?: string }>> | undefined;
  const errors = Object.fromEntries(
    Object.entries(aboutErrors ?? {}).map(([k, v]) => [k, v?.message])
  ) as Partial<Record<LangCode, string>>;

  return (
    <PanelSection title={t("title")} description={t("description")}>
      <Controller
        control={control}
        name="about"
        render={({ field }) => (
          <LanguageTabsEditor
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            errors={errors}
            maxLength={ABOUT_MAX}
            placeholder={t("placeholder")}
            defaultLanguage={watch("defaultLanguage")}
            onDefaultChange={(code) => setValue("defaultLanguage", code, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
          />
        )}
      />
    </PanelSection>
  );
}

/* ---------- Contact ---------- */

export function ContactSection({ form }: AgencySectionProps) {
  const t = useTranslations("panel.agency.contact");
  const { register, formState } = form;
  const e = formState.errors;
  return (
    <PanelSection title={t("title")} description={t("description")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("person")} className="sm:col-span-2">
          {(p) => <Input {...p} {...register("contactPerson")} autoComplete="name" />}
        </FormField>
        <FormField label={t("phone")} required error={e.phone?.message}>
          {(p) => <Input {...p} type="tel" {...register("phone")} autoComplete="tel" />}
        </FormField>
        <FormField label={t("whatsapp")} hint={t("whatsappHint")} error={e.whatsapp?.message}>
          {(p) => <Input {...p} type="tel" {...register("whatsapp")} />}
        </FormField>
        <FormField label={t("email")} required error={e.email?.message}>
          {(p) => <Input {...p} type="email" {...register("email")} autoComplete="email" />}
        </FormField>
        <FormField label={t("website")} error={e.website?.message}>
          {(p) => <Input {...p} type="url" placeholder="https://" {...register("website")} />}
        </FormField>
      </div>
    </PanelSection>
  );
}

/* ---------- Address ---------- */

export function AddressSection({ form }: AgencySectionProps) {
  const t = useTranslations("panel.agency.address");
  const { register, formState } = form;
  return (
    <PanelSection title={t("title")}>
      <div className="grid gap-4 sm:grid-cols-6">
        <FormField label={t("street")} className="sm:col-span-6">
          {(p) => <Input {...p} {...register("street")} autoComplete="street-address" />}
        </FormField>
        <FormField label={t("town")} className="sm:col-span-3">
          {(p) => (
            <Controller
              control={form.control}
              name="town"
              render={({ field }) => <LocationInput {...p} value={field.value ?? ""} onChange={(text) => field.onChange(text)} />}
            />
          )}
        </FormField>
        <FormField label={t("province")} className="sm:col-span-2">
          {(p) => <Input {...p} {...register("province")} />}
        </FormField>
        <FormField label={t("postcode")} error={formState.errors.postcode?.message} className="sm:col-span-1">
          {(p) => <Input {...p} inputMode="numeric" maxLength={5} {...register("postcode")} autoComplete="postal-code" />}
        </FormField>
      </div>
    </PanelSection>
  );
}

/* ---------- Areas and languages ---------- */

export function AreasSection({ form }: AgencySectionProps) {
  const t = useTranslations("panel.agency.areas");
  const to = useTranslations("panel.options");
  const { control, formState } = form;
  return (
    <PanelSection title={t("title")}>
      <Controller
        control={control}
        name="regions"
        render={({ field }) => (
          <ChipGroup
            legend={t("regions")}
            options={REGION_KEYS.map((v) => ({ value: v, label: to(`regions.${v}`) }))}
            selected={field.value}
            onChange={field.onChange}
            error={formState.errors.regions?.message}
          />
        )}
      />
      <div className="mt-6">
        <Controller
          control={control}
          name="spokenLanguages"
          render={({ field }) => (
            <ChipGroup
              legend={t("languages")}
              options={SPOKEN_LANGUAGE_KEYS.map((v) => ({ value: v, label: to(`spokenLanguages.${v}`) }))}
              selected={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </PanelSection>
  );
}

/* ---------- Business info (partners only) ---------- */

export function BusinessInfoSection({ form }: AgencySectionProps) {
  const t = useTranslations("panel.agency.business");
  const { register, formState } = form;
  const e = formState.errors;
  return (
    <PanelSection title={t("title")} description={t("description")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("legalName")}>{(p) => <Input {...p} {...register("legalName")} />}</FormField>
        <FormField label={t("cif")}>
          {(p) => (
            <Input
              {...p}
              {...register("cif", { setValueAs: (v: string) => v.toUpperCase() })}
              className="uppercase"
            />
          )}
        </FormField>
        <FormField label={t("founded")} error={e.founded?.message}>
          {(p) => <Input {...p} inputMode="numeric" maxLength={4} {...register("founded")} />}
        </FormField>
        <FormField label={t("commission")} error={e.commission?.message}>
          {(p) => <Input {...p} placeholder={t("commissionPlaceholder")} {...register("commission")} />}
        </FormField>
      </div>
    </PanelSection>
  );
}

/* ---------- Social ---------- */

export function SocialSection({ form }: AgencySectionProps) {
  const t = useTranslations("panel.agency.social");
  const { register, formState } = form;
  const e = formState.errors;
  const networks = [
    { key: "facebook", label: "Facebook" },
    { key: "instagram", label: "Instagram" },
    { key: "linkedin", label: "LinkedIn" },
  ] as const;
  return (
    <PanelSection title={t("title")} description={t("description")}>
      <div className="grid gap-4 sm:grid-cols-3">
        {networks.map(({ key, label }) => (
          <FormField key={key} label={label} error={e[key]?.message}>
            {(p) => <Input {...p} type="url" placeholder="https://" {...register(key)} />}
          </FormField>
        ))}
      </div>
    </PanelSection>
  );
}
