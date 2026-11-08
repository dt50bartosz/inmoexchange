"use client";

import { useRef, useState } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/panel/FormField";
import ChipGroup from "@/components/panel/ChipGroup";
import SimpleSelect from "@/components/panel/SimpleSelect";
import LocationInput from "@/components/panel/LocationInput";
import PanelCard from "@/components/panel/PanelCard";
import PanelSection from "@/components/panel/PanelSection";
import { useUnsavedWarning } from "@/components/panel/useUnsavedWarning";
import { focusFirstInvalid } from "@/components/panel/mock";
import { AMENITIES, COLLABORATION_TYPES, CURRENCIES, DEFAULT_PROTECTION_DAYS, PROJECT_STATUSES } from "@/lib/constants/developers";
import { PROPERTY_TYPES } from "@/lib/constants/property";
import { developmentSchema } from "@/lib/schemas/developments";
import { newUnitsErrors, newUnitsSchema, type NewUnitRow } from "@/lib/schemas/units";
import type { createDeveloperDocumentUploadUrls, createUploadUrls } from "@/lib/actions/upload";
import type { SaveProjectResult } from "@/lib/server/developer/developments";
import type { Project, ProjectValues } from "@/types/developers";
import ProjectImagesField from "./ProjectImagesField";
import DevelopmentDocumentsField from "./DevelopmentDocumentsField";
import NewUnitsTable, { toUnitRows, type UnitRowState } from "./NewUnitsTable";

type Props = {
  project: Project | null;
  /** `units`: the rows of the units table, only when creating (always [] when editing: units have their own tab). */
  submit: (values: ProjectValues, units: NewUnitRow[]) => Promise<SaveProjectResult>;
  onSaved: (project: Project, created: boolean) => void;
  cancelHref: string;
  requestUrls?: typeof createUploadUrls;
  /** Signed URLs for PDFs, into the caller's own pending folder (developer or admin). */
  requestDocumentUrls: typeof createDeveloperDocumentUploadUrls;
  /**
   * New development only (developer panel): shows "Publicar" next to "Guardar borrador". Called after the draft
   * is created, to publish it; the caller shows the result and opens the development's page.
   */
  onPublish?: (project: Project) => Promise<void>;
};

const EMPTY: ProjectValues = {
  name: "",
  address: "",
  town: "",
  province: "",
  country: "Spain",
  latitude: null,
  longitude: null,
  mapsUrl: "",
  description: { es: "", en: "" },
  amenities: [],
  images: [],
  mainImageId: null,
  documents: [],
  unitsTotal: null,
  unitsAvailable: null,
  propertyTypes: [],
  priceFrom: null,
  priceTo: null,
  currency: "EUR",
  bedroomsMin: null,
  bedroomsMax: null,
  status: "planning",
  expectedCompletion: "",
  actualCompletion: "",
  // No collaboration value is ever filled in for the developer
  collaboration: { type: "percent", value: null, currency: "EUR", paymentTerms: "", notes: "" },
  protectionDays: DEFAULT_PROTECTION_DAYS,
};

function toValues(p: Project): ProjectValues {
  const { name, address, town, province, country, latitude, longitude, mapsUrl, description, amenities, images, mainImageId, unitsTotal, unitsAvailable, propertyTypes, priceFrom, priceTo, currency, bedroomsMin, bedroomsMax, status, expectedCompletion, actualCompletion, collaboration, protectionDays } = p;
  const documents = p.documents.map(({ id, key, kind, name, url }) => ({ id, key, kind, name, url }));
  return { name, address, town, province, country, latitude, longitude, mapsUrl, description, amenities, images, mainImageId, documents, unitsTotal, unitsAvailable, propertyTypes, priceFrom, priceTo, currency, bedroomsMin, bedroomsMax, status, expectedCompletion, actualCompletion, collaboration, protectionDays };
}

/** "" → null, anything else → a number (zod then checks it). */
const toNumber = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));

/** Add / edit a development project. Used by the admin CRM and the developer's panel. */
export default function ProjectForm({ project, submit, onSaved, cancelHref, requestUrls, requestDocumentUrls, onPublish }: Props) {
  const t = useTranslations("Projects");
  const td = useTranslations("promotor.developments");
  // Which footer button sent the form. The submit handler reads the ref (state set in the click only
  // arrives on the next render); the state only switches the button label to "Guardando…" / "Publicando…".
  const canPublish = !project && !!onPublish;
  const intentRef = useRef<"draft" | "publish">("draft");
  const [intent, setIntentState] = useState<"draft" | "publish">("draft");
  const setIntent = (v: "draft" | "publish") => {
    intentRef.current = v;
    setIntentState(v);
  };
  const tt = useTranslations("panel.properties.types");
  const ta = useTranslations("Projects.amenities");
  const tu = useTranslations("units.newTable");
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm<ProjectValues>({ resolver: zodResolver(developmentSchema), defaultValues: project ? toValues(project) : EMPTY, mode: "onTouched" });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const e = formState.errors;
  useUnsavedWarning(formState.isDirty && !formState.isSubmitting);
  const images = useWatch({ control, name: "images" });
  const mainImageId = useWatch({ control, name: "mainImageId" });
  const documents = useWatch({ control, name: "documents" });
  const collaborationType = useWatch({ control, name: "collaboration.type" });
  const propertyTypes = useWatch({ control, name: "propertyTypes" });
  // New development only: its units, typed in a table (keys "<row>.<field>" for errors)
  const [unitRows, setUnitRows] = useState<UnitRowState[]>([]);
  const [unitErrors, setUnitErrors] = useState<Record<string, string>>({});
  /** The table's rows if they are all valid; otherwise shows the errors and returns null. */
  const checkUnits = (): NewUnitRow[] | null => {
    if (project) return [];
    const rows = toUnitRows(unitRows);
    const parsed = newUnitsSchema.safeParse(rows);
    setUnitErrors(parsed.success ? {} : newUnitsErrors(rows));
    return parsed.success ? parsed.data : null;
  };
  // Server errors on single documents ("documents.2"), shown next to that document
  const documentErrors = Object.fromEntries(((e.documents ?? []) as { message?: string }[]).map((d, i) => [i, d?.message]));

  // With units, the price range, bedrooms, types and counts are worked out from them (read-only here)
  const fromUnits = project?.summarySource === "units";
  const num = (name: FieldPath<ProjectValues>, opts: { step?: string; min?: number; readOnly?: boolean } = {}) => (
    <FormField label={t(`fields.${name}` as "fields.name")} hint={t("fields.optional")} error={(e[name as keyof typeof e] as { message?: string } | undefined)?.message}>
      {(p) => <Input {...p} type="number" inputMode={opts.step ? "decimal" : "numeric"} step={opts.step ?? "1"} min={opts.min} readOnly={opts.readOnly} className={opts.readOnly ? "bg-muted" : undefined} {...register(name, { setValueAs: toNumber })} />}
    </FormField>
  );

  const onSubmit = handleSubmit(
    async (values) => {
      const publishing = canPublish && intentRef.current === "publish";
      // "Publicar" with something missing: save nothing yet, say what to add (the server checks again after saving)
      if (publishing) {
        const missing = [
          values.collaboration?.value == null ? "collaboration" : null,
          (values.images ?? []).length === 0 ? "images" : null,
          !values.description?.es?.trim() && !values.description?.en?.trim() ? "description" : null,
        ].filter((m): m is string => m !== null);
        if (missing.length) {
          toast.error(td("incomplete", { missing: missing.map((m) => td(`missing.${m}` as "missing.images")).join(", ") }));
          return;
        }
      }
      const units = checkUnits();
      if (!units) {
        toast.error(tu("invalid"));
        focusFirstInvalid(formRef.current);
        return;
      }
      let res: SaveProjectResult;
      try {
        res = await submit(values, units);
      } catch {
        toast.error(t("errors.generic"));
        return;
      }
      if (!res.ok) {
        if (res.error === "validation_error" && res.fieldErrors) {
          // Unit rows come back as "units.<row>.<field>"
          const rowErrors = Object.entries(res.fieldErrors).filter(([f]) => f.startsWith("units."));
          if (rowErrors.length) setUnitErrors(Object.fromEntries(rowErrors.map(([f, m]) => [f.slice("units.".length), m])));
          for (const [field, message] of Object.entries(res.fieldErrors)) {
            if (field.startsWith("units.")) continue;
            setError((field.startsWith("images.") ? "images" : field) as FieldPath<ProjectValues>, { type: "server", message: message === "photo_invalid" ? "required" : message });
          }
          const fields = Object.keys(res.fieldErrors);
          toast.error(fields.some((f) => f.startsWith("units.")) ? tu("invalid") : fields.some((f) => f.startsWith("images")) ? t("errors.images") : fields.some((f) => f.startsWith("documents")) ? t("errors.documents") : t("errors.invalid"));
        } else
          toast.error(
            res.error === "not_found" ? t("errors.notFound") : res.error === "images_failed" ? t("errors.images") : res.error === "documents_failed" ? t("errors.documents") : t("errors.generic")
          );
        return;
      }
      reset(toValues(res.data)); // saved images now have their final urls
      setUnitRows([]);
      if (publishing && onPublish) {
        await onPublish(res.data);
        return;
      }
      toast.success(project ? t("saved") : t("created"));
      onSaved(res.data, !project);
    },
    () => {
      checkUnits(); // show the table's errors too, in the same go
      focusFirstInvalid(formRef.current);
    }
  );

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit}>
      <PanelCard>
        <PanelSection title={t("sections.basics.title")} description={t("sections.basics.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("fields.name")} required error={e.name?.message} className="sm:col-span-2">
              {(p) => <Input {...p} {...register("name")} autoComplete="off" />}
            </FormField>
            <FormField label={t("fields.status")}>
              {(p) => (
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <SimpleSelect {...p} value={field.value} onChange={field.onChange} options={PROJECT_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) }))} />
                  )}
                />
              )}
            </FormField>
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="propertyTypes"
                render={({ field }) => (
                  <ChipGroup legend={t("fields.propertyTypes")} options={PROPERTY_TYPES.map((v) => ({ value: v, label: tt(v) }))} selected={field.value ?? []} onChange={field.onChange} disabled={fromUnits} />
                )}
              />
            </div>
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="amenities"
                render={({ field }) => (
                  <ChipGroup legend={t("fields.amenities")} options={AMENITIES.map((v) => ({ value: v, label: ta(v) }))} selected={field.value ?? []} onChange={field.onChange} />
                )}
              />
            </div>
          </div>
        </PanelSection>

        <PanelSection title={t("sections.location.title")} description={t("sections.location.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("fields.town")} required error={e.town?.message}>
              {(p) => (
                <Controller control={control} name="town" render={({ field }) => <LocationInput {...p} value={field.value ?? ""} onChange={(text) => field.onChange(text)} />} />
              )}
            </FormField>
            <FormField label={t("fields.province")} hint={t("fields.optional")} error={e.province?.message}>
              {(p) => <Input {...p} {...register("province")} />}
            </FormField>
            <FormField label={t("fields.address")} hint={t("fields.optional")} error={e.address?.message} className="sm:col-span-2">
              {(p) => <Input {...p} {...register("address")} />}
            </FormField>
            <FormField label={t("fields.country")} hint={t("fields.optional")} error={e.country?.message}>
              {(p) => <Input {...p} {...register("country")} />}
            </FormField>
            <FormField label={t("fields.mapsUrl")} hint={t("fields.optional")} error={e.mapsUrl?.message}>
              {(p) => <Input {...p} type="url" placeholder="https://maps.google.com/…" {...register("mapsUrl")} />}
            </FormField>
            {num("latitude", { step: "any" })}
            {num("longitude", { step: "any" })}
          </div>
        </PanelSection>

        <PanelSection title={t("sections.pricing.title")} description={fromUnits ? t("fromUnits") : t("sections.pricing.description")}>
          <div className="grid gap-4 sm:grid-cols-3">
            {num("priceFrom", { min: 0, readOnly: fromUnits })}
            {num("priceTo", { min: 0, readOnly: fromUnits })}
            <FormField label={t("fields.currency")}>
              {(p) => (
                <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => <SimpleSelect {...p} value={field.value} onChange={field.onChange} options={CURRENCIES.map((c) => ({ value: c, label: t(`currencies.${c}`) }))} />}
                />
              )}
            </FormField>
            {num("bedroomsMin", { min: 0, readOnly: fromUnits })}
            {num("bedroomsMax", { min: 0, readOnly: fromUnits })}
          </div>
        </PanelSection>

        <PanelSection title={t("sections.units.title")} description={fromUnits ? t("fromUnits") : t("sections.units.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {num("unitsTotal", { min: 0, readOnly: fromUnits })}
            {num("unitsAvailable", { min: 0, readOnly: fromUnits })}
          </div>
        </PanelSection>

        {!project && (
          <PanelSection title={tu("title")} description={tu("description")}>
            <NewUnitsTable rows={unitRows} onChange={setUnitRows} developmentTypes={propertyTypes ?? []} errors={unitErrors} />
          </PanelSection>
        )}

        <PanelSection title={t("sections.timeline.title")} description={t("sections.timeline.description")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("fields.expectedCompletion")} hint={t("fields.optional")} error={e.expectedCompletion?.message}>
              {(p) => <Input {...p} type="date" {...register("expectedCompletion")} />}
            </FormField>
            <FormField label={t("fields.actualCompletion")} hint={t("fields.optional")} error={e.actualCompletion?.message}>
              {(p) => <Input {...p} type="date" {...register("actualCompletion")} />}
            </FormField>
          </div>
        </PanelSection>

        <PanelSection title={t("sections.collaboration.title")} description={t("sections.collaboration.description")}>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={t("fields.collaborationType")}>
              {(p) => (
                <Controller
                  control={control}
                  name="collaboration.type"
                  render={({ field }) => (
                    <SimpleSelect {...p} value={field.value} onChange={field.onChange} options={COLLABORATION_TYPES.map((c) => ({ value: c, label: t(`collaborationTypes.${c}`) }))} />
                  )}
                />
              )}
            </FormField>
            <FormField
              label={collaborationType === "fixed" ? t("fields.collaborationAmount") : t("fields.collaborationPercent")}
              hint={t("fields.neededToPublish")}
              error={e.collaboration?.value?.message}
            >
              {(p) => (
                <Input {...p} type="number" inputMode="decimal" step="any" min={0} max={collaborationType === "percent" ? 100 : undefined} {...register("collaboration.value", { setValueAs: toNumber })} />
              )}
            </FormField>
            {collaborationType === "fixed" && (
              <FormField label={t("fields.currency")}>
                {(p) => (
                  <Controller
                    control={control}
                    name="collaboration.currency"
                    render={({ field }) => <SimpleSelect {...p} value={field.value} onChange={field.onChange} options={CURRENCIES.map((c) => ({ value: c, label: t(`currencies.${c}`) }))} />}
                  />
                )}
              </FormField>
            )}
            <FormField label={t("fields.paymentTerms")} hint={t("fields.optional")} error={e.collaboration?.paymentTerms?.message} className="sm:col-span-3">
              {(p) => <Textarea {...p} rows={3} placeholder={t("fields.paymentTermsPlaceholder")} {...register("collaboration.paymentTerms")} />}
            </FormField>
            <FormField label={t("fields.collaborationNotes")} hint={t("fields.optional")} error={e.collaboration?.notes?.message} className="sm:col-span-3">
              {(p) => <Textarea {...p} rows={2} {...register("collaboration.notes")} />}
            </FormField>
            <FormField label={t("fields.protectionDays")} error={e.protectionDays?.message}>
              {(p) => <Input {...p} type="number" inputMode="numeric" min={1} max={730} {...register("protectionDays", { setValueAs: toNumber })} />}
            </FormField>
            <p className="self-end text-sm text-muted-foreground sm:col-span-2">{t("fields.protectionDaysHint")}</p>
          </div>
        </PanelSection>

        <PanelSection title={t("sections.images.title")} description={t("sections.images.description")}>
          <ProjectImagesField
            images={images ?? []}
            mainImageId={mainImageId ?? null}
            requestUrls={requestUrls}
            onChange={(next, main) => {
              form.setValue("images", next, { shouldDirty: true });
              form.setValue("mainImageId", main, { shouldDirty: true });
            }}
          />
          {e.images && <p className="mt-2 text-sm text-destructive">{e.images.message === "required_to_publish" ? t("errors.requiredToPublish") : t("errors.images")}</p>}
        </PanelSection>

        <PanelSection title={t("sections.documents.title")} description={t("sections.documents.description")}>
          <DevelopmentDocumentsField
            value={documents ?? []}
            errors={documentErrors}
            requestUrls={requestDocumentUrls}
            onChange={(next) => form.setValue("documents", next, { shouldDirty: true })}
          />
        </PanelSection>

        <PanelSection title={t("sections.about.title")} description={t("sections.about.description")}>
          <div className="grid gap-4">
            {(["es", "en"] as const).map((lang) => (
              <FormField key={lang} label={t(`fields.description_${lang}`)} hint={t("fields.neededToPublish")} error={e.description?.[lang]?.message}>
                {(p) => <Textarea {...p} lang={lang} rows={7} {...register(`description.${lang}`)} />}
              </FormField>
            ))}
          </div>
        </PanelSection>
      </PanelCard>

      <div className="sticky bottom-0 z-30 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        {canPublish && <p className="mr-auto hidden text-sm text-muted-foreground md:block">{td("footerHint")}</p>}
        <Link href={cancelHref} className={buttonVariants({ variant: "outline" })}>
          {t("cancel")}
        </Link>
        {canPublish ? (
          <>
            <Button type="submit" variant="outline" disabled={formState.isSubmitting} onClick={() => setIntent("draft")}>
              {formState.isSubmitting && intent === "draft" ? t("saving") : td("saveDraft")}
            </Button>
            <Button type="submit" disabled={formState.isSubmitting} onClick={() => setIntent("publish")}>
              <Eye aria-hidden className="size-4" />
              {formState.isSubmitting && intent === "publish" ? td("publishing") : td("publish")}
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t("saving") : project ? t("save") : t("create")}
          </Button>
        )}
      </div>
    </form>
  );
}
