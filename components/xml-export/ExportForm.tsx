"use client";

import { useRef } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import PageHeader from "@/components/panel/PageHeader";
import PanelCard from "@/components/panel/PanelCard";
import PanelSection from "@/components/panel/PanelSection";
import FormField from "@/components/panel/FormField";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { useUnsavedWarning } from "@/components/panel/useUnsavedWarning";
import { focusFirstInvalid } from "@/components/panel/mock";
import { usePropertyFormat } from "@/components/properties/usePropertyFormat";
import { REGION_KEYS } from "@/lib/constants/options";
import { PROPERTY_CONDITIONS, PROPERTY_TYPES } from "@/lib/constants/property";
import { ROUTES } from "@/lib/constants/routes";
import { MIN_BEDS_OPTIONS } from "@/lib/constants/xmlExport";
import { xmlExportSchema } from "@/lib/schemas/xmlExport";
import type { XmlExport, XmlExportFilters, XmlExportFormValues } from "@/types/xmlExport";
import type { ActionResult } from "@/lib/server/action-result";
import { createXmlExport } from "@/app/[locale]/panel/exportar-xml/new/server/actions";
import { updateXmlExport } from "@/app/[locale]/panel/exportar-xml/[id]/edit/server/actions";
import { useExportPreview } from "./useExportPreview";

const EMPTY: XmlExportFormValues = { name: "", query: "", area: "all", type: "all", condition: "all", minPrice: null, maxPrice: null, minBeds: 0 };

const asOptionalNumber = { setValueAs: (v: string) => (v === "" || v == null ? null : Number(v)) };

export default function ExportForm({ item }: { item?: XmlExport }) {
  const t = useTranslations("panel.xmlExport");
  const tp = useTranslations("panel.properties");
  const to = useTranslations("panel.options");
  const f = usePropertyFormat();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm({
    resolver: zodResolver(xmlExportSchema),
    // Links saved before the new-build filter have no condition
    defaultValues: item ? { name: item.name, ...item.filters, condition: item.filters.condition ?? "all" } : EMPTY,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, formState, setError } = form;
  const e = formState.errors;
  useUnsavedWarning(formState.isDirty && !formState.isSubmitSuccessful);

  // Live preview of what the link will contain
  const v = useWatch({ control });
  const liveFilters: XmlExportFilters = {
    query: v.query ?? "",
    area: v.area ?? "all",
    type: v.type ?? "all",
    condition: v.condition ?? "all",
    minPrice: typeof v.minPrice === "number" && !Number.isNaN(v.minPrice) ? v.minPrice : null,
    maxPrice: typeof v.maxPrice === "number" && !Number.isNaN(v.maxPrice) ? v.maxPrice : null,
    minBeds: v.minBeds ?? 0,
  };
  const { preview, loading } = useExportPreview(liveFilters);
  const total = preview ? preview.mine + preview.partners : 0;

  /** Shows errors returned by the server on the right fields. */
  const showServerErrors = (result: Extract<ActionResult<XmlExport>, { ok: false }>) => {
    // Keeps the form "unsaved" so the leave-page warning stays on.
    setError("root.server", { type: result.error });
    if (result.error !== "validation_error" || !result.fieldErrors) {
      toast.error(t("toasts.saveFailed"));
      return;
    }
    for (const [path, message] of Object.entries(result.fieldErrors)) {
      setError(path as FieldPath<XmlExportFormValues>, { type: "server", message });
    }
    toast.error(t("toasts.fixErrors"));
    focusFirstInvalid(formRef.current);
  };

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        const result = item ? await updateXmlExport(item.id, values) : await createXmlExport(values);
        if (!result.ok) return showServerErrors(result);
        toast.success(t(item ? "toasts.saved" : "toasts.created", { name: result.data.name }));
        router.push(ROUTES.xmlExports);
      } catch {
        setError("root.server", { type: "server_error" });
        toast.error(t("toasts.saveFailed"));
      }
    },
    () => focusFirstInvalid(formRef.current)
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <Link href={ROUTES.xmlExports} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden className="size-4" />
        {t("form.back")}
      </Link>
      <PageHeader title={item ? t("form.editTitle") : t("form.newTitle")} description={t("form.description")} />

      <form ref={formRef} noValidate onSubmit={onSubmit}>
        <PanelCard>
          <PanelSection title={t("form.sections.name")} description={t("form.sections.nameHint")}>
            <FormField label={t("form.fields.name")} required error={e.name?.message} className="max-w-md">
              {(p) => <Input {...p} {...register("name")} placeholder={t("form.fields.namePlaceholder")} autoComplete="off" />}
            </FormField>
          </PanelSection>

          <PanelSection title={t("form.sections.filters")} description={t("form.sections.filtersHint")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("form.fields.query")} hint={t("form.fields.optional")} className="sm:col-span-2">
                {(p) => <Input {...p} {...register("query")} placeholder={t("form.fields.queryPlaceholder")} />}
              </FormField>
              <FormField label={t("form.fields.area")}>
                {(p) => (
                  <Controller
                    control={control}
                    name="area"
                    render={({ field }) => (
                      <SimpleSelect
                        {...p}
                        value={field.value}
                        onChange={field.onChange}
                        options={[{ value: "all", label: t("form.fields.anyArea") }, ...REGION_KEYS.map((r) => ({ value: r, label: to(`regions.${r}`) }))]}
                      />
                    )}
                  />
                )}
              </FormField>
              <FormField label={t("form.fields.type")}>
                {(p) => (
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <SimpleSelect
                        {...p}
                        value={field.value}
                        onChange={field.onChange}
                        options={[{ value: "all", label: t("form.fields.anyType") }, ...PROPERTY_TYPES.map((x) => ({ value: x, label: tp(`types.${x}`) }))]}
                      />
                    )}
                  />
                )}
              </FormField>
              <FormField label={t("form.fields.condition")}>
                {(p) => (
                  <Controller
                    control={control}
                    name="condition"
                    render={({ field }) => (
                      <SimpleSelect
                        {...p}
                        value={field.value ?? "all"}
                        onChange={field.onChange}
                        options={[{ value: "all", label: t("form.fields.anyCondition") }, ...PROPERTY_CONDITIONS.map((x) => ({ value: x, label: tp(`conditions.${x}`) }))]}
                      />
                    )}
                  />
                )}
              </FormField>
              <FormField label={t("form.fields.minPrice")} hint={t("form.fields.optional")} error={e.minPrice?.message}>
                {(p) => <Input {...p} type="number" inputMode="numeric" min={0} step={10000} {...register("minPrice", asOptionalNumber)} />}
              </FormField>
              <FormField label={t("form.fields.maxPrice")} hint={t("form.fields.optional")} error={e.maxPrice?.message}>
                {(p) => <Input {...p} type="number" inputMode="numeric" min={0} step={10000} {...register("maxPrice", asOptionalNumber)} />}
              </FormField>
              <FormField label={t("form.fields.minBeds")}>
                {(p) => (
                  <Controller
                    control={control}
                    name="minBeds"
                    render={({ field }) => (
                      <SimpleSelect
                        {...p}
                        value={String(field.value)}
                        onChange={(x) => field.onChange(Number(x))}
                        options={MIN_BEDS_OPTIONS.map((n) => ({ value: String(n), label: n === 0 ? t("form.fields.anyBeds") : t("form.fields.bedsPlus", { n }) }))}
                      />
                    )}
                  />
                )}
              </FormField>
            </div>
          </PanelSection>

          <PanelSection title={t("form.sections.preview")} description={t("form.sections.previewHint")}>
            <p className="text-sm font-medium" aria-live="polite">
              {preview
                ? t("form.previewCount", { count: total, mine: preview.mine, partners: preview.partners })
                : t("form.previewLoading")}
            </p>
            {!preview ? null : preview.items.length > 0 ? (
              <ul className={`mt-3 divide-y rounded-lg border text-sm transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
                {preview.items.map(({ property: p, mine: isMine }) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 truncate">
                      {f.title(p)} <span className="text-muted-foreground">· {p.code}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {p.condition === "newBuild" && <Badge variant="outline">{tp("conditions.newBuild")}</Badge>}
                      <Badge variant={isMine ? "default" : "secondary"}>{isMine ? t("form.mine") : t("form.partner")}</Badge>
                      <span className="tabular-nums">{f.price(p.price)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{t("form.noMatches")}</p>
            )}
            {preview && total > preview.items.length && (
              <p className="mt-2 text-xs text-muted-foreground">{t("form.andMore", { count: total - preview.items.length })}</p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">{t("form.formatNote")}</p>
          </PanelSection>
        </PanelCard>

        <div className="sticky bottom-0 z-30 -mx-4 mt-6 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <Link href={ROUTES.xmlExports} className={buttonVariants({ variant: "outline" })}>
            {t("cancel")}
          </Link>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t("form.saving") : item ? t("form.save") : t("form.createLink")}
          </Button>
        </div>
      </form>
    </div>
  );
}
