"use client";

import { useRef } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import PageHeader from "@/components/panel/PageHeader";
import PanelCard from "@/components/panel/PanelCard";
import SaveBar from "@/components/panel/SaveBar";
import { useUnsavedWarning } from "@/components/panel/useUnsavedWarning";
import { focusFirstInvalid } from "@/components/panel/mock";
import { uploadImages } from "@/lib/images/upload-images";
import {
  AboutSection,
  AddressSection,
  AreasSection,
  BrandingSection,
  BusinessInfoSection,
  ContactSection,
  SocialSection,
} from "./sections/sections";
import PreviewPanel from "./preview/PreviewPanel";
import { agencySchema, type Agency, type AgencyFormValues } from "@/lib/schemas/agency";
import { saveAgencyProfile } from "@/app/[locale]/panel/mi-agencia/server/actions";

/** `initial` is the agency's saved profile, loaded on the server. */
export default function AgencyDetailsPage({ initial }: { initial: Agency }) {
  const t = useTranslations("panel.agency");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const logoFile = useRef<File | null>(null);

  const form = useForm({
    resolver: zodResolver(agencySchema),
    defaultValues: initial as AgencyFormValues,
    mode: "onTouched",
  });
  const { handleSubmit, formState, reset, control, setError } = form;
  const live = useWatch({ control }) as AgencyFormValues;
  useUnsavedWarning(formState.isDirty);

  const save = handleSubmit(
    async (values) => {
      try {
        // A new logo goes to R2 first; the save moves it into place. Removed = null, unchanged = undefined.
        let logo: { key: string } | null | undefined;
        if (logoFile.current) {
          const { uploaded } = await uploadImages([logoFile.current]);
          if (!uploaded[0]) {
            toast.error(t("toasts.logoFailed"));
            return;
          }
          URL.revokeObjectURL(uploaded[0].previewUrl);
          logo = { key: uploaded[0].key };
        } else if (!values.logoUrl && formState.defaultValues?.logoUrl) {
          logo = null;
        }

        const result = await saveAgencyProfile(values, logo);
        if (!result.ok) {
          setError("root.server", { type: result.error }); // keeps the leave-page warning on
          if (result.error === "validation_error" && result.fieldErrors) {
            for (const [path, message] of Object.entries(result.fieldErrors)) {
              setError(path as FieldPath<AgencyFormValues>, { type: "server", message });
            }
            toast.error(t("toasts.fixErrors"));
            focusFirstInvalid(formRef.current);
          } else {
            toast.error(t(result.error === "logo_failed" ? "toasts.logoFailed" : "toasts.saveFailed"));
          }
          return;
        }

        logoFile.current = null;
        reset(result.data as AgencyFormValues);
        toast.success(t("toasts.saved"));
        router.refresh(); // the panel layout shows the name and logo too
      } catch {
        setError("root.server", { type: "server_error" });
        toast.error(t("toasts.saveFailed"));
      }
    },
    () => {
      toast.error(t("toasts.fixErrors"));
      focusFirstInvalid(formRef.current);
    }
  );

  const discard = () => {
    logoFile.current = null;
    reset();
  };

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">
        <PageHeader title={t("title")} description={t("description")} />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form ref={formRef} noValidate onSubmit={save}>
            <PanelCard>
              <BrandingSection form={form} onLogoFile={(f) => (logoFile.current = f)} />
              <AboutSection form={form} />
              <ContactSection form={form} />
              <AddressSection form={form} />
              <AreasSection form={form} />
              <BusinessInfoSection form={form} />
              <SocialSection form={form} />
            </PanelCard>
          </form>
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <PreviewPanel agency={live} />
          </aside>
        </div>
      </div>
      <SaveBar visible={formState.isDirty} saving={formState.isSubmitting} onSave={save} onDiscard={discard} />
    </div>
  );
}
