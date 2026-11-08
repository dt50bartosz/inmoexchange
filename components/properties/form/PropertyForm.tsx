"use client";

import { useRef, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ArrowLeft, Rss } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/panel/PageHeader";
import PanelCard from "@/components/panel/PanelCard";
import PanelSection from "@/components/panel/PanelSection";
import FormField from "@/components/panel/FormField";
import SimpleSelect from "@/components/panel/SimpleSelect";
import LocationInput from "@/components/panel/LocationInput";
import ChipGroup from "@/components/panel/ChipGroup";
import LanguageTabsEditor from "@/components/panel/LanguageTabsEditor";
import { useUnsavedWarning } from "@/components/panel/useUnsavedWarning";
import { focusFirstInvalid } from "@/components/panel/mock";
import { ROUTES } from "@/lib/constants/routes";
import { REGION_KEYS } from "@/lib/constants/options";
import type { LangCode } from "@/lib/constants/languages";
import {
  DESCRIPTION_MAX,
  ENERGY_RATINGS,
  FEATURE_KEYS,
  PROPERTY_CONDITIONS,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
} from "@/lib/constants/property";
import { propertyEditSchema } from "@/lib/schemas/property";
import type { Property, PropertyEditOutput, PropertyEditValues } from "@/types/property";
import PhotosField from "./PhotosField";
import PriceHistory from "./PriceHistory";
import CoordinatesField from "./CoordinatesField";
import { useFeeds } from "../store";
import { createProperty, type CreatePropertyResult } from "@/app/[locale]/panel/mis-propiedades/new/server/actions";
import { updateProperty, type UpdatePropertyResult } from "@/app/[locale]/panel/mis-propiedades/[id]/edit/server/actions";
import { usePropertyFormat } from "../usePropertyFormat";

/* ---------- Form values ---------- */

const emptyProperty = (): PropertyEditValues => ({
  type: "" as PropertyEditValues["type"],
  condition: "" as PropertyEditValues["condition"],
  reference: "",
  town: "",
  province: "",
  area: "" as PropertyEditValues["area"],
  address: "",
  hideAddress: true,
  latitude: null,
  longitude: null,
  coordinatesSource: null,
  price: undefined as unknown as number,
  bedrooms: undefined as unknown as number,
  bathrooms: undefined as unknown as number,
  builtM2: undefined as unknown as number,
  plotM2: null,
  yearBuilt: null,
  energyRating: null,
  communityFees: null,
  features: [],
  photos: [],
  description: { en: "", es: "", pl: "" },
  status: "active",
  shared: true,
  commission: "50/50",
  newPrice: null,
});

const toFormValues = (p: Property): PropertyEditValues => {
  // distanceFromTown is the server's: the form only shows its own live estimate
  const { id, source, hidden, priceHistory, createdAt, updatedAt, distanceFromTown, ...values } = p;
  return { ...values, features: [...p.features], photos: [...p.photos], description: { ...p.description }, newPrice: null };
};

/** register() options for number inputs: "" → undefined (required) or null (optional). */
const asNumber = { setValueAs: (v: string) => (v === "" || v == null ? undefined : Number(v)) };
const asOptionalNumber = { setValueAs: (v: string) => (v === "" || v == null ? null : Number(v)) };

/* ---------- Page ---------- */

/** `stats`: the edit page's stats card, shown under the title (read-only, not part of the form). */
type Props = { property?: Property; stats?: ReactNode };

export default function PropertyForm({ property, stats }: Props) {
  const t = useTranslations("panel.properties");
  const to = useTranslations("panel.options");
  const f = usePropertyFormat();
  const router = useRouter();
  const feeds = useFeeds();
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = !!property;
  const readOnly = property?.source.kind === "feed";
  const feedName =
    property?.source.kind === "feed" ? feeds.find((x) => x.id === (property.source as { feedId: string }).feedId)?.name : undefined;

  const form = useForm<PropertyEditValues, unknown, PropertyEditOutput>({
    resolver: zodResolver(propertyEditSchema),
    defaultValues: property ? toFormValues(property) : emptyProperty(),
    mode: "onTouched",
  });
  const { register, control, handleSubmit, formState, setError, setValue } = form;
  const e = formState.errors;
  const shared = useWatch({ control, name: "shared" });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  useUnsavedWarning(formState.isDirty && !formState.isSubmitSuccessful);

  /** Shows errors returned by the server on the right fields. */
  const showServerErrors = (result: Extract<CreatePropertyResult | UpdatePropertyResult, { ok: false }>) => {
    // Keeps the form "unsaved" so the leave-page warning stays on.
    setError("root.server", { type: result.error });

    if (result.error === "photos_failed") {
      toast.error(t("form.photos.uploadFailed"));
      return;
    }
    if (result.error !== "validation_error" || !result.fieldErrors) {
      toast.error(t("toasts.saveFailed"));
      return;
    }

    let photoProblem = false;
    for (const [path, code] of Object.entries(result.fieldErrors)) {
      if (path.startsWith("photos")) {
        photoProblem = true;
        continue;
      }
      const message = code === "reference_taken" ? t("errors.referenceTaken") : String(code);
      setError(path as FieldPath<PropertyEditValues>, { type: "server", message });
    }
    toast.error(photoProblem ? t("form.photos.uploadFailed") : t("toasts.fixErrors"));
    focusFirstInvalid(formRef.current);
  };

  const onSubmit = handleSubmit(
    async ({ newPrice, ...values }) => {
      if (property) {
        // Editing saves to MongoDB + R2. A new price moves the old one into the price history.
        const result = await updateProperty(property.id, { ...values, newPrice });
        if (!result.ok) {
          showServerErrors(result);
          return;
        }
        toast.success(t("toasts.saved", { ref: result.data.code }));
        router.push(ROUTES.properties);
        return;
      }

      // Adding saves to MongoDB + R2 through the server action.
      const result = await createProperty({ ...values, status: "active" });
      if (!result.ok) {
        showServerErrors(result);
        return;
      }
      toast.success(t("toasts.published", { ref: result.data.code }));
      router.push(ROUTES.properties);
    },
    () => {
      toast.error(t("toasts.fixErrors"));
      focusFirstInvalid(formRef.current);
    }
  );

  const langErrors = Object.fromEntries(
    Object.entries(e.description ?? {})
      .filter(([k]) => k.length === 2)
      .map(([k, v]) => [k, (v as { message?: string } | undefined)?.message])
  ) as Partial<Record<LangCode, string>>;

  const numberProps = { type: "number" as const, inputMode: "numeric" as const, min: 0, disabled: readOnly };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <Link href={ROUTES.properties} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden className="size-4" />
        {t("form.backToList")}
      </Link>
      <PageHeader
        title={property ? f.title(property) : t("form.newTitle")}
        description={property ? t("form.editDescription", { ref: property.code }) : t("form.newDescription")}
      />

      {readOnly && (
        <div className="mb-6 flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <Rss aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>{t("form.feedNotice", { feed: feedName ?? t("list.deletedFeed") })}</p>
        </div>
      )}

      {stats}

      <form ref={formRef} noValidate onSubmit={onSubmit}>
        <PanelCard>
          {/* Basics */}
          <PanelSection title={t("form.sections.basics")}>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={t("form.fields.type")} required error={e.type?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <SimpleSelect
                        {...p}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={readOnly}
                        placeholder={t("form.choose")}
                        options={PROPERTY_TYPES.map((v) => ({ value: v, label: t(`types.${v}`) }))}
                      />
                    )}
                  />
                )}
              </FormField>
              <FormField label={t("form.fields.condition")} required error={e.condition?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="condition"
                    render={({ field }) => (
                      <SimpleSelect
                        {...p}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={readOnly}
                        placeholder={t("form.choose")}
                        options={PROPERTY_CONDITIONS.map((v) => ({ value: v, label: t(`conditions.${v}`) }))}
                      />
                    )}
                  />
                )}
              </FormField>
              <FormField label={t("form.fields.reference")} required error={e.reference?.message}>
                {(p) => <Input {...p} {...register("reference")} disabled={readOnly} autoComplete="off" />}
              </FormField>
            </div>
          </PanelSection>

          {/* Location */}
          <PanelSection title={t("form.sections.location")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("form.fields.town")} required error={e.town?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="town"
                    render={({ field }) => (
                      <LocationInput
                        {...p}
                        value={field.value ?? ""}
                        disabled={readOnly}
                        onChange={(text, location) => {
                          field.onChange(text);
                          // A known location also fills in the province and the area (both can still be changed)
                          if (location) {
                            setValue("province", location.province, { shouldDirty: true });
                            setValue("area", location.region, { shouldDirty: true, shouldValidate: true });
                          }
                        }}
                      />
                    )}
                  />
                )}
              </FormField>
              <FormField label={t("form.fields.province")}>
                {(p) => <Input {...p} {...register("province")} disabled={readOnly} />}
              </FormField>
              <FormField label={t("form.fields.area")} required error={e.area?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="area"
                    render={({ field }) => (
                      <SimpleSelect
                        {...p}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={readOnly}
                        placeholder={t("form.choose")}
                        options={REGION_KEYS.map((v) => ({ value: v, label: to(`regions.${v}`) }))}
                      />
                    )}
                  />
                )}
              </FormField>
              <FormField label={t("form.fields.address")} hint={t("form.hints.optional")}>
                {(p) => <Input {...p} {...register("address")} disabled={readOnly} autoComplete="off" />}
              </FormField>
              <Controller
                control={control}
                name="hideAddress"
                render={({ field }) => (
                  <label className="flex items-start gap-3 sm:col-span-2">
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={readOnly} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">{t("form.fields.hideAddress")}</span>
                      <span className="block text-sm text-muted-foreground">{t("form.hints.hideAddress")}</span>
                    </span>
                  </label>
                )}
              />
              <CoordinatesField form={form} readOnly={readOnly} />
            </div>
          </PanelSection>

          {/* Price and size */}
          <PanelSection title={t("form.sections.priceSize")}>
            <div className="space-y-6">
              {property ? (
                <PriceHistory form={form} property={property} disabled={readOnly} />
              ) : (
                <FormField label={t("form.fields.price")} required error={e.price?.message} className="max-w-xs">
                  {(p) => (
                    <div className="relative">
                      <Input {...p} {...numberProps} step={1000} {...register("price", asNumber)} className="pr-8" />
                      <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                        €
                      </span>
                    </div>
                  )}
                </FormField>
              )}
              <div className="grid gap-4 sm:grid-cols-4">
                <FormField label={t("form.fields.bedrooms")} required error={e.bedrooms?.message}>
                  {(p) => <Input {...p} {...numberProps} {...register("bedrooms", asNumber)} />}
                </FormField>
                <FormField label={t("form.fields.bathrooms")} required error={e.bathrooms?.message}>
                  {(p) => <Input {...p} {...numberProps} {...register("bathrooms", asNumber)} />}
                </FormField>
                <FormField label={t("form.fields.builtM2")} required error={e.builtM2?.message}>
                  {(p) => <Input {...p} {...numberProps} {...register("builtM2", asNumber)} />}
                </FormField>
                <FormField label={t("form.fields.plotM2")} hint={t("form.hints.optional")} error={e.plotM2?.message}>
                  {(p) => <Input {...p} {...numberProps} {...register("plotM2", asOptionalNumber)} />}
                </FormField>
                <FormField label={t("form.fields.yearBuilt")} hint={t("form.hints.optional")} error={e.yearBuilt?.message}>
                  {(p) => <Input {...p} {...numberProps} placeholder="2008" {...register("yearBuilt", asOptionalNumber)} />}
                </FormField>
                <FormField label={t("form.fields.communityFees")} hint={t("form.hints.perMonth")} error={e.communityFees?.message}>
                  {(p) => <Input {...p} {...numberProps} {...register("communityFees", asOptionalNumber)} />}
                </FormField>
                <FormField label={t("form.fields.energyRating")} className="sm:col-span-2">
                  {(p) => (
                    <Controller
                      control={control}
                      name="energyRating"
                      render={({ field }) => (
                        <SimpleSelect
                          {...p}
                          value={field.value ?? "none"}
                          onChange={(v) => field.onChange(v === "none" ? null : v)}
                          disabled={readOnly}
                          options={[
                            { value: "none", label: t("form.notSpecified") },
                            ...ENERGY_RATINGS.map((r) => ({ value: r, label: r === "inProgress" ? t("energy.inProgress") : r })),
                          ]}
                        />
                      )}
                    />
                  )}
                </FormField>
              </div>
            </div>
          </PanelSection>

          {/* Features */}
          <PanelSection title={t("form.sections.features")}>
            <Controller
              control={control}
              name="features"
              render={({ field }) => (
                <ChipGroup
                  legend={t("form.fields.features")}
                  options={FEATURE_KEYS.map((v) => ({ value: v, label: t(`features.${v}`) }))}
                  selected={field.value}
                  onChange={(next) => field.onChange(next as typeof field.value)}
                  disabled={readOnly}
                />
              )}
            />
          </PanelSection>

          {/* Photos */}
          <PanelSection title={t("form.sections.photos")} description={t("form.sections.photosHint")}>
            <Controller
              control={control}
              name="photos"
              render={({ field }) => (
                <PhotosField
                  value={field.value}
                  onChange={field.onChange}
                  disabled={readOnly}
                  onUploadingChange={setUploadingPhotos}
                />
              )}
            />
          </PanelSection>

          {/* Description */}
          <PanelSection title={t("form.sections.description")} description={t("form.sections.descriptionHint")}>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <LanguageTabsEditor
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  errors={langErrors}
                  maxLength={DESCRIPTION_MAX}
                  placeholder={t("form.hints.description")}
                  disabled={readOnly}
                />
              )}
            />
            {e.description?.message && <p className="mt-2 text-sm text-destructive">{t("form.descriptionRequired")}</p>}
          </PanelSection>

          {/* Sharing (always editable, also for feed properties) */}
          <PanelSection title={t("form.sections.sharing")} description={t("form.sections.sharingHint")}>
            <div className="space-y-4">
              {isEdit && !readOnly && (
                <FormField label={t("form.fields.status")} className="max-w-xs">
                  {(p) => (
                    <Controller
                      control={control}
                      name="status"
                      render={({ field }) => (
                        <SimpleSelect
                          {...p}
                          value={field.value}
                          onChange={field.onChange}
                          options={PROPERTY_STATUSES.map((v) => ({ value: v, label: t(`statuses.${v}`) }))}
                        />
                      )}
                    />
                  )}
                </FormField>
              )}
              <Controller
                control={control}
                name="shared"
                render={({ field }) => (
                  <label className="flex items-start gap-3">
                    <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                    <span>
                      <span className="block text-sm font-medium">{t("form.fields.shared")}</span>
                      <span className="block text-sm text-muted-foreground">{readOnly ? t("form.hints.sharedFeed") : t("form.hints.shared")}</span>
                    </span>
                  </label>
                )}
              />
              {shared && (
                <FormField label={t("form.fields.commission")} hint={t("form.hints.commission")} error={e.commission?.message} className="max-w-xs">
                  {(p) => <Input {...p} {...register("commission")} placeholder="50/50" />}
                </FormField>
              )}
            </div>
          </PanelSection>
        </PanelCard>

        <div className="sticky bottom-0 z-30 -mx-4 mt-6 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <Link href={ROUTES.properties} className={buttonVariants({ variant: "outline" })}>
            {t("form.cancel")}
          </Link>
          <Button type="submit" disabled={formState.isSubmitting || uploadingPhotos}>
            {formState.isSubmitting || uploadingPhotos ? t("form.saving") : isEdit ? t("form.saveChanges") : t("form.publish")}
          </Button>
        </div>
      </form>
    </div>
  );
}
