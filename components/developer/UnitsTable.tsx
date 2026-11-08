"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import SimpleSelect from "@/components/panel/SimpleSelect";
import ConfirmDialog from "@/components/security/ui/ConfirmDialog";
import { UNIT_STATUSES, type UnitStatus } from "@/lib/constants/developers";
import type { ActionResult } from "@/lib/server/action-result";
import type { BulkUnitsResult, SaveUnitResult } from "@/lib/server/developer/units";
import type { BulkUnitsValues, Unit, UnitValues } from "@/types/developers";
import UnitDialog from "./UnitDialog";

/** Server actions already bound to one development (the developer's own, or the admin's for a developer). */
export type UnitActions = {
  create: (values: UnitValues) => Promise<SaveUnitResult>;
  update: (unitId: string, values: UnitValues) => Promise<SaveUnitResult>;
  remove: (unitId: string) => Promise<ActionResult<null, "not_found">>;
  bulk: (values: BulkUnitsValues) => Promise<BulkUnitsResult>;
};

const STATUS_STYLE: Record<UnitStatus, string> = {
  available: "bg-success-soft text-success",
  reserved: "bg-warning-soft text-warning",
  sold: "bg-muted text-muted-foreground",
};

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  const t = useTranslations("units.statuses");
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{t(status)}</span>;
}

/** The units of one development: table, add / edit / delete, and bulk status and price changes. */
export default function UnitsTable({ units, currency, actions }: { units: Unit[]; currency: string; actions: UnitActions }) {
  const t = useTranslations("units");
  const tt = useTranslations("panel.properties.types");
  const format = useFormatter();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Unit | null | undefined>(undefined); // undefined = closed, null = new
  const [deleting, setDeleting] = useState<Unit | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<UnitStatus | "">("");
  const [priceMode, setPriceMode] = useState<"none" | "set" | "percent">("none");
  const [priceValue, setPriceValue] = useState("");

  const ids = units.map((u) => u.id);
  const visibleSelected = ids.filter((id) => selected.has(id));
  const allSelected = units.length > 0 && visibleSelected.length === units.length;
  const toggle = (id: string) => setSelected((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));
  const money = (n: number | null) => (n === null ? "—" : format.number(n, { style: "currency", currency, maximumFractionDigits: 0 }));
  const done = () => router.refresh();

  const applyBulk = async () => {
    const value = Number(priceValue);
    const price = priceMode === "none" || priceValue.trim() === "" || Number.isNaN(value) ? undefined : { mode: priceMode, value };
    if (!bulkStatus && !price) return toast.error(t("bulk.nothing"));
    setBusy(true);
    const res = await actions.bulk({ ids: visibleSelected, ...(bulkStatus ? { status: bulkStatus } : {}), ...(price ? { price } : {}) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return toast.error(t("errors.invalid"));
    toast.success(t("bulk.done", { count: res.data.changed }));
    setSelected(new Set());
    setBulkStatus("");
    setPriceMode("none");
    setPriceValue("");
    done();
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await actions.remove(deleting.id).catch(() => null);
    setBusy(false);
    setDeleting(null);
    if (!res?.ok) return toast.error(t("errors.notFound"));
    toast.success(t("deleted"));
    done();
  };

  const counts = Object.fromEntries(UNIT_STATUSES.map((s) => [s, units.filter((u) => u.status === s).length])) as Record<UnitStatus, number>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("summary", { total: units.length, available: counts.available, reserved: counts.reserved, sold: counts.sold })}
        </p>
        <Button type="button" onClick={() => setEditing(null)}>
          <Plus aria-hidden className="size-4" />
          {t("add")}
        </Button>
      </div>

      {visibleSelected.length > 0 && (
        <div role="region" aria-label={t("bulk.title")} className="flex flex-wrap items-end gap-3 rounded-lg border border-primary/30 bg-secondary p-3">
          <p className="w-full text-sm font-medium sm:w-auto sm:self-center">{t("bulk.selected", { count: visibleSelected.length })}</p>
          <SimpleSelect
            aria-label={t("bulk.status")}
            value={bulkStatus || "keep"}
            onChange={(v) => setBulkStatus(v === "keep" ? "" : (v as UnitStatus))}
            options={[{ value: "keep", label: t("bulk.keepStatus") }, ...UNIT_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) }))]}
            className="w-44"
          />
          <SimpleSelect
            aria-label={t("bulk.price")}
            value={priceMode}
            onChange={(v) => setPriceMode(v as typeof priceMode)}
            options={[
              { value: "none", label: t("bulk.keepPrice") },
              { value: "set", label: t("bulk.setPrice") },
              { value: "percent", label: t("bulk.percent") },
            ]}
            className="w-48"
          />
          {priceMode !== "none" && (
            <Input
              aria-label={priceMode === "set" ? t("bulk.setPrice") : t("bulk.percent")}
              type="number"
              inputMode="decimal"
              step={priceMode === "percent" ? "0.1" : "1000"}
              placeholder={priceMode === "percent" ? "+5 / -3" : "250000"}
              value={priceValue}
              onChange={(e) => setPriceValue(e.target.value)}
              className="w-36"
            />
          )}
          <Button type="button" disabled={busy} onClick={applyBulk}>
            {t("bulk.apply")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSelected(new Set())}>
            {t("bulk.clear")}
          </Button>
        </div>
      )}

      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <p className="font-medium">{t("empty")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyHint")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={t("selectAll")}
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(ids))}
                    className="size-4 accent-[var(--primary)]"
                  />
                </th>
                <th scope="col" className="px-3 py-2 font-medium">{t("fields.reference")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("fields.type")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("columns.rooms")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("columns.size")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("fields.floor")}</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{t("fields.price")}</th>
                <th scope="col" className="px-3 py-2 font-medium">{t("fields.status")}</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">{t("columns.actions")}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {units.map((u) => (
                <tr key={u.id} className={selected.has(u.id) ? "bg-secondary/60" : undefined}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={t("select", { reference: u.reference })}
                      checked={selected.has(u.id)}
                      onChange={() => toggle(u.id)}
                      className="size-4 accent-[var(--primary)]"
                    />
                  </td>
                  <th scope="row" className="px-3 py-2 text-left font-medium">{u.reference}</th>
                  <td className="px-3 py-2">{tt(u.type)}</td>
                  <td className="px-3 py-2 tabular-nums">{t("columns.roomsValue", { beds: u.bedrooms, baths: u.bathrooms })}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {u.builtM2 !== null ? `${format.number(u.builtM2)} m²` : "—"}
                    {u.terraceM2 ? <span className="text-muted-foreground"> + {format.number(u.terraceM2)} m² {t("columns.terrace")}</span> : null}
                  </td>
                  <td className="px-3 py-2">
                    {u.floor || "—"}
                    {u.orientation ? <span className="text-muted-foreground"> · {t(`orientations.${u.orientation}`)}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{money(u.price)}</td>
                  <td className="px-3 py-2"><UnitStatusBadge status={u.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={t("edit", { reference: u.reference })} onClick={() => setEditing(u)}>
                        <Pencil aria-hidden className="size-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" aria-label={t("delete", { reference: u.reference })} onClick={() => setDeleting(u)}>
                        <Trash2 aria-hidden className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UnitDialog
        open={editing !== undefined}
        unit={editing ?? null}
        onOpenChange={(open) => !open && setEditing(undefined)}
        save={(values) => (editing ? actions.update(editing.id, values) : actions.create(values))}
        onSaved={done}
      />

      <ConfirmDialog
        open={!!deleting}
        title={t("deleteTitle", { reference: deleting?.reference ?? "" })}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
