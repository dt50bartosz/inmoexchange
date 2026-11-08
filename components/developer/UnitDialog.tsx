"use client";

import { useEffect } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FormField from "@/components/panel/FormField";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { ORIENTATIONS, UNIT_STATUSES } from "@/lib/constants/developers";
import { PROPERTY_TYPES } from "@/lib/constants/property";
import { unitSchema } from "@/lib/schemas/units";
import type { SaveUnitResult } from "@/lib/server/developer/units";
import type { Unit, UnitValues } from "@/types/developers";

const EMPTY: UnitValues = {
  reference: "",
  type: "apartment",
  bedrooms: 2,
  bathrooms: 2,
  builtM2: null,
  plotM2: null,
  terraceM2: null,
  floor: "",
  orientation: "",
  price: null,
  status: "available",
};

const toValues = (u: Unit): UnitValues => ({
  reference: u.reference,
  type: u.type,
  bedrooms: u.bedrooms,
  bathrooms: u.bathrooms,
  builtM2: u.builtM2,
  plotM2: u.plotM2,
  terraceM2: u.terraceM2,
  floor: u.floor,
  orientation: u.orientation,
  price: u.price,
  status: u.status,
});

/** "" → null, anything else → a number (zod then checks it). */
const toNumber = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));

type Props = {
  open: boolean;
  /** null = new unit. */
  unit: Unit | null;
  onOpenChange: (open: boolean) => void;
  save: (values: UnitValues) => Promise<SaveUnitResult>;
  onSaved: () => void;
};

/** Add / edit one unit. Same zod schema as the server (lib/schemas/units.ts). */
export default function UnitDialog({ open, unit, onOpenChange, save, onSaved }: Props) {
  const t = useTranslations("units");
  const tt = useTranslations("panel.properties.types");
  const form = useForm<UnitValues>({ resolver: zodResolver(unitSchema), defaultValues: EMPTY, mode: "onTouched" });
  const { register, control, handleSubmit, formState, reset, setError } = form;
  const e = formState.errors;

  useEffect(() => {
    if (open) reset(unit ? toValues(unit) : EMPTY);
  }, [open, unit, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const res = await save(values).catch(() => null);
    if (!res?.ok) {
      if (res?.error === "validation_error" && res.fieldErrors) {
        for (const [field, message] of Object.entries(res.fieldErrors)) setError(field as FieldPath<UnitValues>, { type: "server", message });
      }
      toast.error(res?.error === "too_many" ? t("errors.tooMany") : res?.error === "not_found" ? t("errors.notFound") : t("errors.invalid"));
      return;
    }
    toast.success(unit ? t("saved") : t("added"));
    onOpenChange(false);
    onSaved();
  });

  const num = (name: "bedrooms" | "bathrooms" | "builtM2" | "plotM2" | "terraceM2" | "price", required = false) => (
    <FormField label={t(`fields.${name}`)} required={required} hint={required ? undefined : t("optional")} error={e[name]?.message}>
      {(p) => <Input {...p} type="number" inputMode="numeric" min={0} step={name.endsWith("M2") ? "any" : "1"} {...register(name, { setValueAs: toNumber })} />}
    </FormField>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form noValidate onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{unit ? t("editTitle", { reference: unit.reference }) : t("addTitle")}</DialogTitle>
          </DialogHeader>

          <div className="grid max-h-[65vh] gap-4 overflow-y-auto py-4 sm:grid-cols-3">
            <FormField label={t("fields.reference")} required error={e.reference?.message}>
              {(p) => <Input {...p} placeholder={t("fields.referencePlaceholder")} autoComplete="off" {...register("reference")} />}
            </FormField>
            <FormField label={t("fields.type")} required>
              {(p) => (
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => <SimpleSelect {...p} value={field.value} onChange={field.onChange} options={PROPERTY_TYPES.map((v) => ({ value: v, label: tt(v) }))} />}
                />
              )}
            </FormField>
            <FormField label={t("fields.status")} required>
              {(p) => (
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => <SimpleSelect {...p} value={field.value} onChange={field.onChange} options={UNIT_STATUSES.map((v) => ({ value: v, label: t(`statuses.${v}`) }))} />}
                />
              )}
            </FormField>
            {num("bedrooms", true)}
            {num("bathrooms", true)}
            {num("price")}
            {num("builtM2")}
            {num("plotM2")}
            {num("terraceM2")}
            <FormField label={t("fields.floor")} hint={t("optional")} error={e.floor?.message}>
              {(p) => <Input {...p} placeholder={t("fields.floorPlaceholder")} {...register("floor")} />}
            </FormField>
            <FormField label={t("fields.orientation")} hint={t("optional")}>
              {(p) => (
                <Controller
                  control={control}
                  name="orientation"
                  render={({ field }) => (
                    <SimpleSelect
                      {...p}
                      value={field.value || "none"}
                      onChange={(v) => field.onChange(v === "none" ? "" : v)}
                      options={[{ value: "none", label: "—" }, ...ORIENTATIONS.map((o) => ({ value: o, label: t(`orientations.${o}`) }))]}
                    />
                  )}
                />
              )}
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? t("saving") : unit ? t("save") : t("add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
