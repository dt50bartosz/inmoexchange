"use client";

import { useRef, useState, type ReactNode } from "react";
import { Controller, useForm, type DefaultValues, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ZodType } from "zod";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import ChipGroup from "@/components/panel/ChipGroup";
import FormField from "@/components/panel/FormField";
import LocationInput from "@/components/panel/LocationInput";
import PanelCard from "@/components/panel/PanelCard";
import PanelSection from "@/components/panel/PanelSection";
import { useUnsavedWarning } from "@/components/panel/useUnsavedWarning";
import { focusFirstInvalid } from "@/components/panel/mock";
import { REGION_KEYS } from "@/lib/constants/options";
import { FILE_INPUT_ACCEPT } from "@/lib/images/config";
import { uploadImages } from "@/lib/images/upload-images";
import { PROFILE_DESCRIPTION_MAX, companyProfileSchema, type CompanyProfileValues } from "@/lib/schemas/developer-profile";
import type { createDeveloperUploadUrls } from "@/lib/actions/upload";
import type { LogoChange, SaveProfileResult } from "@/lib/server/developer/profile";

type Props<T extends CompanyProfileValues> = {
  defaultValues: T;
  logoUrl: string | null;
  /** Signed upload URLs into the caller's own pending folder (developer or admin). */
  requestUploadUrls: typeof createDeveloperUploadUrls;
  /** A server action; the developer id is never part of what the browser sends. */
  onSave: (values: T, logo: LogoChange) => Promise<SaveProfileResult>;
  /** Where to go after saving / on Cancel; nothing = stay and refresh. */
  doneHref?: string;
  /** The admin's CRM form: its own schema (the profile plus CRM fields) and fields. */
  schema?: ZodType<unknown, T>;
  extraSections?: (form: UseFormReturn<T>) => ReactNode;
};

/**
 * The developer's company profile form: the developer's own page (/promotor/perfil) and the admin on its behalf.
 * Same fields, same zod schema (lib/schemas/developer-profile.ts), same save helper on the server.
 */
export default function DeveloperProfileForm<T extends CompanyProfileValues>({
  defaultValues,
  logoUrl,
  requestUploadUrls,
  onSave,
  doneHref,
  schema,
  extraSections,
}: Props<T>) {
  const t = useTranslations("developerProfile");
  const to = useTranslations("panel.options");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // undefined = unchanged, null = removed, { key, preview } = new upload
  const [logo, setLogo] = useState<{ key: string; preview: string } | null | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  const form = useForm<T>({
    resolver: zodResolver((schema ?? companyProfileSchema) as never) as unknown as Resolver<T>,
    defaultValues: defaultValues as DefaultValues<T>,
    mode: "onTouched",
  });
  // The profile fields are the same whatever extra fields the caller adds
  const f = form as unknown as UseFormReturn<CompanyProfileValues>;
  const { register, control, formState } = f;
  const e = formState.errors;
  useUnsavedWarning((formState.isDirty || logo !== undefined) && !formState.isSubmitSuccessful);

  const shownLogo = logo === undefined ? logoUrl : (logo?.preview ?? null);
  const optional = t("optional");

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { uploaded } = await uploadImages([file], { requestUrls: requestUploadUrls });
      if (uploaded[0]) setLogo({ key: uploaded[0].key, preview: uploaded[0].previewUrl });
      else toast.error(t("logo.invalid"));
    } catch {
      toast.error(t("logo.failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSubmit = form.handleSubmit(
    async (values) => {
      const res = await onSave(values, logo === undefined ? undefined : logo && { key: logo.key }).catch(() => null);
      if (!res?.ok) {
        const key = !res ? "server" : res.error === "logo_failed" ? "logo" : res.error === "not_found" ? "notFound" : "validation";
        toast.error(t(`errors.${key}`));
        return;
      }
      toast.success(t("saved"));
      setLogo(undefined);
      form.reset(values);
      if (doneHref) router.push(doneHref);
      router.refresh();
    },
    () => focusFirstInvalid(formRef.current)
  );

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit}>
      <PanelCard>
        <PanelSection title={t("logo.title")} description={t("logo.description")}>
          <div className="flex flex-wrap items-center gap-4">
            {shownLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownLogo} alt="" className="size-16 rounded border bg-white object-contain" />
            ) : (
              <span aria-hidden className="flex size-16 items-center justify-center rounded border bg-muted text-xl font-semibold">
                {defaultValues.name[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            <input ref={fileRef} type="file" accept={FILE_INPUT_ACCEPT} hidden onChange={(ev) => pickLogo(ev.target.files?.[0])} />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <ImagePlus aria-hidden className="size-4" />
              {uploading ? t("logo.uploading") : shownLogo ? t("logo.replace") : t("logo.upload")}
            </Button>
            {shownLogo && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setLogo(null)}>
                <Trash2 aria-hidden className="size-4" />
                {t("logo.remove")}
              </Button>
            )}
          </div>
        </PanelSection>

        <PanelSection title={t("company.title")} description={t("company.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("company.name")} required error={e.name?.message}>
              {(p) => <Input {...p} {...register("name")} autoComplete="organization" />}
            </FormField>
            <FormField label={t("company.legalName")} hint={optional} error={e.legalName?.message}>
              {(p) => <Input {...p} {...register("legalName")} />}
            </FormField>
            <FormField label={t("company.cif")} hint={optional} error={e.cif?.message}>
              {(p) => <Input {...p} className="uppercase" {...register("cif")} />}
            </FormField>
            <FormField label={t("company.website")} hint={optional} error={e.website?.message}>
              {(p) => <Input {...p} type="url" placeholder="https://" {...register("website")} autoComplete="url" />}
            </FormField>
          </div>
        </PanelSection>

        <PanelSection title={t("about.title")} description={t("about.description")}>
          <div className="grid gap-4">
            {(["es", "en"] as const).map((lang) => (
              <FormField key={lang} label={t(`about.${lang}`)} hint={optional} error={e.description?.[lang]?.message}>
                {(p) => <Textarea {...p} lang={lang} rows={5} maxLength={PROFILE_DESCRIPTION_MAX} {...register(`description.${lang}`)} />}
              </FormField>
            ))}
          </div>
        </PanelSection>

        <PanelSection title={t("contact.title")} description={t("contact.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("contact.person")} hint={optional} error={e.contactPerson?.message}>
              {(p) => <Input {...p} {...register("contactPerson")} autoComplete="name" />}
            </FormField>
            <FormField label={t("contact.position")} hint={optional} error={e.contactPosition?.message}>
              {(p) => <Input {...p} placeholder={t("contact.positionPlaceholder")} {...register("contactPosition")} />}
            </FormField>
            <FormField label={t("contact.email")} hint={optional} error={e.contactEmail?.message}>
              {(p) => <Input {...p} type="email" {...register("contactEmail")} autoComplete="email" />}
            </FormField>
            <FormField label={t("contact.phone")} hint={optional} error={e.phone?.message}>
              {(p) => <Input {...p} type="tel" {...register("phone")} autoComplete="tel" />}
            </FormField>
          </div>
        </PanelSection>

        <PanelSection title={t("address.title")} description={t("address.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("address.street")} hint={optional} error={e.street?.message} className="sm:col-span-2">
              {(p) => <Input {...p} {...register("street")} autoComplete="street-address" />}
            </FormField>
            <FormField label={t("address.town")} hint={optional} error={e.town?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="town"
                  render={({ field }) => <LocationInput {...p} value={field.value ?? ""} onChange={(text) => field.onChange(text)} />}
                />
              )}
            </FormField>
            <FormField label={t("address.postcode")} hint={optional} error={e.postcode?.message}>
              {(p) => <Input {...p} {...register("postcode")} autoComplete="postal-code" />}
            </FormField>
            <FormField label={t("address.province")} hint={optional} error={e.province?.message}>
              {(p) => <Input {...p} {...register("province")} />}
            </FormField>
            <FormField label={t("address.country")} hint={optional} error={e.country?.message}>
              {(p) => <Input {...p} {...register("country")} autoComplete="country-name" />}
            </FormField>
          </div>
        </PanelSection>

        <PanelSection title={t("zones.title")}>
          <Controller
            control={control}
            name="regions"
            render={({ field }) => (
              <ChipGroup
                legend={t("zones.legend")}
                options={REGION_KEYS.map((r) => ({ value: r, label: to(`regions.${r}`) }))}
                selected={field.value ?? []}
                onChange={field.onChange}
                error={e.regions?.message}
              />
            )}
          />
        </PanelSection>

        {extraSections?.(form)}
      </PanelCard>

      <div className="sticky bottom-0 z-30 -mx-4 mt-6 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        {doneHref && (
          <Link href={doneHref} className={buttonVariants({ variant: "outline" })}>
            {t("cancel")}
          </Link>
        )}
        <Button type="submit" disabled={formState.isSubmitting || uploading}>
          {formState.isSubmitting ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
