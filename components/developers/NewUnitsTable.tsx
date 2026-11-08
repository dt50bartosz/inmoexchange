"use client";

import { useTranslations } from "next-intl";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/constants/property";
import { NEW_UNITS_MAX, hasPlot, type NewUnitRow } from "@/lib/schemas/units";
import { useValidationMessage } from "@/components/panel/useValidationMessage";

/** One row as typed (inputs hold text); `key` only keeps React rows stable. */
export type UnitRowState = {
  key: string;
  reference: string;
  type: PropertyType;
  bedrooms: string;
  bathrooms: string;
  builtM2: string;
  /** Only used when the type has a plot (townhouse, villa, plot). */
  plotM2: string;
  floor: string;
  price: string;
};

const NUMBER_FIELDS = ["bedrooms", "bathrooms", "builtM2", "plotM2", "price"] as const;
const COLUMNS = ["reference", "type", "bedrooms", "bathrooms", "builtM2", "plotM2", "floor", "price"] as const;
// Wide screens: one row per unit, like a table. Phones: two columns per unit, each field with its label.
// The plot column only exists while some row has a type with a plot.
const GRID_BASE = "grid grid-cols-2 gap-x-3 gap-y-2 md:items-start md:gap-y-0";
const GRID = {
  short: `${GRID_BASE} md:grid-cols-[5.5rem_minmax(8rem,1fr)_4.5rem_4.5rem_5.5rem_5.5rem_minmax(7rem,1fr)_2.75rem]`,
  withPlot: `${GRID_BASE} md:grid-cols-[5.5rem_minmax(8rem,1fr)_4.5rem_4.5rem_5.5rem_5.5rem_5.5rem_minmax(7rem,1fr)_2.75rem]`,
};

/** Text inputs → the values the schema checks. Empty m² / price = not given; empty bedrooms / bathrooms = invalid. */
export function toUnitRows(rows: UnitRowState[]): NewUnitRow[] {
  const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  return rows.map((r) => ({
    reference: r.reference,
    type: r.type,
    bedrooms: n(r.bedrooms) as number,
    bathrooms: n(r.bathrooms) as number,
    builtM2: n(r.builtM2),
    plotM2: hasPlot(r.type) ? n(r.plotM2) : null,
    floor: r.floor,
    price: n(r.price),
  }));
}

let nextKey = 0;
const newKey = () => `u${++nextKey}`;

/** The next free number as reference ("1", "2"…), whatever the developer renamed. */
function nextReference(rows: UnitRowState[]) {
  const taken = new Set(rows.map((r) => r.reference.trim().toLowerCase()));
  let i = rows.length + 1;
  while (taken.has(String(i))) i++;
  return String(i);
}

type Props = {
  rows: UnitRowState[];
  onChange: (rows: UnitRowState[]) => void;
  /** Property types ticked on the development: offered first (all types when none is ticked). */
  developmentTypes: PropertyType[];
  /** Errors from the schema or the server, keyed "<row>.<field>" (translation keys under panel.validation). */
  errors: Record<string, string>;
};

/** "Nueva promoción": the development's units in one table (optional). Status starts as available. */
export default function NewUnitsTable({ rows, onChange, developmentTypes, errors }: Props) {
  const t = useTranslations("units");
  const tt = useTranslations("panel.properties.types");
  const tv = useValidationMessage();
  const types = developmentTypes.length ? developmentTypes : [...PROPERTY_TYPES];
  const full = rows.length >= NEW_UNITS_MAX;

  const set = (i: number, patch: Partial<UnitRowState>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = () =>
    onChange([...rows, { key: newKey(), reference: nextReference(rows), type: types[0], bedrooms: "", bathrooms: "", builtM2: "", plotM2: "", floor: "", price: "" }]);
  // Same unit again (developments often repeat a layout): only the reference changes
  const duplicate = () => {
    const last = rows.at(-1);
    if (last) onChange([...rows, { ...last, key: newKey(), reference: nextReference(rows) }]);
  };
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const err = (i: number, f: string) => errors[`${i}.${f}`];
  const plotColumn = rows.some((r) => hasPlot(r.type));
  const grid = plotColumn ? GRID.withPlot : GRID.short;
  const columns = COLUMNS.filter((c) => c !== "plotM2" || plotColumn);

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <>
          <div aria-hidden className={`${grid} hidden px-1 text-xs font-medium text-muted-foreground md:grid`}>
            {columns.map((c) => (
              <span key={c}>{t(`fields.${c}`)}</span>
            ))}
          </div>
          <ol className="space-y-3 md:space-y-2">
            {rows.map((r, i) => (
              <li key={r.key} className={`${grid} rounded-lg border p-3 md:rounded-none md:border-0 md:p-1`}>
                {columns.map((c) => {
                  const id = `unit-${r.key}-${c}`;
                  const e = err(i, c);
                  // No plot for this type: an empty cell on wide screens, nothing on phones
                  if (c === "plotM2" && !hasPlot(r.type)) {
                    return (
                      <span key={c} aria-hidden className="hidden self-center text-center text-muted-foreground md:block">
                        —
                      </span>
                    );
                  }
                  return (
                    <div key={c} className={c === "type" || c === "price" ? "col-span-2 md:col-span-1" : undefined}>
                      <label htmlFor={id} className="mb-1 block text-xs text-muted-foreground md:sr-only">
                        {t(`fields.${c}`)}
                        <span className="sr-only"> ({t("newTable.row", { n: i + 1 })})</span>
                      </label>
                      {c === "type" ? (
                        <SimpleSelect
                          id={id}
                          value={r.type}
                          onChange={(v) => set(i, { type: v as PropertyType, ...(hasPlot(v) ? {} : { plotM2: "" }) })}
                          options={[...new Set([...types, r.type])].map((v) => ({ value: v, label: tt(v) }))}
                          aria-invalid={!!e}
                        />
                      ) : (
                        <Input
                          id={id}
                          value={r[c]}
                          onChange={(ev) => set(i, { [c]: ev.target.value })}
                          inputMode={(NUMBER_FIELDS as readonly string[]).includes(c) ? (c === "builtM2" || c === "plotM2" ? "decimal" : "numeric") : undefined}
                          placeholder={c === "floor" ? t("fields.floorPlaceholder") : c === "price" ? "€" : undefined}
                          maxLength={c === "reference" || c === "floor" ? (c === "reference" ? 40 : 20) : undefined}
                          aria-invalid={!!e}
                          aria-describedby={e ? `${id}-err` : undefined}
                          className="tabular-nums"
                        />
                      )}
                      {e && (
                        <p id={`${id}-err`} className="mt-1 text-xs text-destructive">
                          {tv(e)}
                        </p>
                      )}
                    </div>
                  );
                })}
                <div className="col-span-2 flex justify-end md:col-span-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label={t("newTable.remove", { n: i + 1, reference: r.reference })}>
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={add} disabled={full}>
          <Plus aria-hidden className="size-4" />
          {t("newTable.add")}
        </Button>
        {rows.length > 0 && (
          <Button type="button" variant="ghost" onClick={duplicate} disabled={full}>
            <Copy aria-hidden className="size-4" />
            {t("newTable.duplicate")}
          </Button>
        )}
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {full ? t("newTable.max", { max: NEW_UNITS_MAX }) : rows.length > 0 ? t("newTable.count", { n: rows.length }) : null}
        </span>
      </div>
    </div>
  );
}
