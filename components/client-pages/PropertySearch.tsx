"use client";

import { useEffect, useMemo, useState } from "react";
import type { Contact } from "@/types/crm";
import { PROPERTY_TYPES, type PropertyType } from "@/types/properties";
import { inputClass } from "../crm/ContactForm";
import { cn } from "../crm/utils";
import { IconSearch, IconX } from "../crm/icons";
import type { Property } from "@/types/client-pages";
import { searchClientPageProperties } from "@/app/[locale]/panel/client-pages/server/actions";
import { PropertyThumb } from "./PropertyThumb";
import { firstName, formatPrice } from "./utils";

type Source = "all" | "own" | "network";
type Condition = "all" | "newBuild" | "resale";

interface Filters {
  text: string;
  priceMin: string;
  priceMax: string;
  bedsMin: string;
  areas: string[];
  types: PropertyType[];
  condition: Condition;
  source: Source;
}

const EMPTY: Filters = { text: "", priceMin: "", priceMax: "", bedsMin: "", areas: [], types: [], condition: "all", source: "all" };

function fromBuyer(b?: Contact): Filters {
  if (!b) return EMPTY;
  return {
    ...EMPTY,
    priceMin: b.budgetMin?.toString() ?? "",
    priceMax: b.budgetMax?.toString() ?? "",
    bedsMin: b.bedroomsMin?.toString() ?? "",
    areas: b.areas,
    types: b.propertyTypes.map((t) => t.toLowerCase() as PropertyType), // CRM uses "Villa", properties use "villa"
  };
}

interface Props {
  buyer?: Contact;
  selectedIds: Set<string>;
  onToggle: (propertyId: string) => void;
  /** Every result list, so the editor can show added properties in the shortlist. */
  onResults?: (results: Property[]) => void;
}

const DELAY_MS = 300;
const toNumber = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? null : Math.max(0, Math.round(Number(v))));

export function PropertySearch({ buyer, selectedIds, onToggle, onResults }: Props) {
  const initial = useMemo(() => fromBuyer(buyer), [buyer]);
  const [f, setF] = useState<Filters>(initial);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((prev) => ({ ...prev, [k]: v }));

  const isBuyerPreset = JSON.stringify(f) === JSON.stringify(initial) && initial !== EMPTY;
  const isEmpty = JSON.stringify(f) === JSON.stringify(EMPTY);

  // Searched on the server: own properties + partners' shared ones (the network rule), cheapest first
  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify(f);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const v: Filters = JSON.parse(key);
      const res = await searchClientPageProperties({
        text: v.text,
        priceMin: toNumber(v.priceMin),
        priceMax: toNumber(v.priceMax),
        bedsMin: toNumber(v.bedsMin) ?? 0,
        areas: v.areas,
        types: v.types,
        condition: v.condition,
        source: v.source,
      }).catch(() => undefined);
      if (cancelled) return;
      setLoading(false);
      if (res?.ok) {
        setResults(res.data);
        onResults?.(res.data);
      }
    }, DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // onResults is a stable setter from the editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const chip = (on: boolean) =>
    cn(
      "rounded-full border px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Filters */}
      <div className="space-y-3 border-b border-border p-4">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="ps-text" className="sr-only">Search listings</label>
          <input
            id="ps-text"
            type="search"
            className={cn(inputClass, "pl-9")}
            placeholder="Town, reference or title"
            value={f.text}
            onChange={(e) => set("text", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label htmlFor="ps-min" className="mb-1 block text-xs text-muted-foreground">From (€)</label>
            <input id="ps-min" inputMode="numeric" className={inputClass} value={f.priceMin} onChange={(e) => set("priceMin", e.target.value.replace(/\D/g, ""))} />
          </div>
          <div>
            <label htmlFor="ps-max" className="mb-1 block text-xs text-muted-foreground">To (€)</label>
            <input id="ps-max" inputMode="numeric" className={inputClass} value={f.priceMax} onChange={(e) => set("priceMax", e.target.value.replace(/\D/g, ""))} />
          </div>
          <div>
            <label htmlFor="ps-beds" className="mb-1 block text-xs text-muted-foreground">Bedrooms</label>
            <select id="ps-beds" className={inputClass} value={f.bedsMin} onChange={(e) => set("bedsMin", e.target.value)}>
              <option value="">Any</option>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={f.types.includes(t)}
              onClick={() => set("types", f.types.includes(t) ? f.types.filter((x) => x !== t) : [...f.types, t])}
              className={chip(f.types.includes(t))}
            >
              {t}
            </button>
          ))}
        </div>

        <div role="group" aria-label="New build or resale" className="inline-flex rounded-md border border-border p-0.5">
          {(
            [
              ["all", "New build and resale"],
              ["newBuild", "New build"],
              ["resale", "Resale"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={f.condition === id}
              onClick={() => set("condition", id)}
              className={cn(
                "rounded px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                f.condition === id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {f.areas.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Areas</span>
            {f.areas.map((a) => (
              <span key={a} className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pl-2.5 pr-1 text-xs text-secondary-foreground">
                {a}
                <button
                  type="button"
                  aria-label={`Remove ${a}`}
                  onClick={() => set("areas", f.areas.filter((x) => x !== a))}
                  className="rounded-full p-0.5 hover:bg-background"
                >
                  <IconX width={12} height={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Listings" className="inline-flex rounded-md border border-border p-0.5">
            {(
              [
                ["all", "All listings"],
                ["own", "Our listings"],
                ["network", "Network"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={f.source === id}
                onClick={() => set("source", id)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  f.source === id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 text-xs">
            {!isEmpty && (
              <button type="button" onClick={() => setF(EMPTY)} className="text-muted-foreground hover:text-foreground">
                Clear filters
              </button>
            )}
            {buyer && !isBuyerPreset && (
              <button type="button" onClick={() => setF(initial)} className="text-primary hover:underline">
                Use {firstName(buyer.name)}&rsquo;s requirements
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <p className="px-4 pb-1 pt-3 text-xs text-muted-foreground" aria-live="polite">
        {loading ? "Searching… " : ""}
        {results.length === 60 ? "60+" : results.length} {results.length === 1 ? "property" : "properties"}
        {isBuyerPreset && buyer ? ` matching ${firstName(buyer.name)}'s requirements` : ""}
      </p>
      <ul className={cn("min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
        {results.map((p) => {
          const added = selectedIds.has(p.id);
          return (
            <li key={p.id} className={cn("flex gap-3 rounded-md border p-2.5", added ? "border-primary/50 bg-primary/5" : "border-border bg-card")}>
              <PropertyThumb property={p} className="size-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.town}, {p.bedrooms} bed, {p.builtM2} m², ref {p.ref}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{formatPrice(p.price)}</span>
                  {p.condition === "newBuild" && <span className="rounded bg-info-soft px-1.5 py-0.5 text-[11px] font-medium text-info">New build</span>}
                  {p.source === "network" && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground" title="Only you see this. The client never sees the listing agency.">
                      Network, {p.listingAgency}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggle(p.id)}
                aria-pressed={added}
                aria-label={added ? `Remove ${p.title} from shortlist` : `Add ${p.title} to shortlist`}
                className={cn(
                  "self-center rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  added ? "text-primary hover:bg-primary/10" : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {added ? "Added" : "Add"}
              </button>
            </li>
          );
        })}
        {!loading && results.length === 0 && (
          <li className="py-10 text-center text-sm text-muted-foreground">
            Nothing matches these filters. Try removing an area or widening the budget.
          </li>
        )}
      </ul>
    </div>
  );
}
