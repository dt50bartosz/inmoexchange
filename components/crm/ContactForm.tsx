"use client";

import { useState } from "react";
import LocationInput from "@/components/panel/LocationInput";
import type { ContactInput, LeadSource, PropertyType, StageId } from "@/types/crm";
import { ACTIVE_STAGES, LANGUAGES, LEAD_SOURCES, PROPERTY_TYPES } from "@/types/crm";
import { cn } from "./utils";

export const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

interface Props {
  initial?: Partial<ContactInput>;
  submitLabel: string;
  showStage?: boolean;
  /** May return a promise: an error message to show, or null when saved. */
  onSubmit: (value: ContactInput) => void | Promise<string | null | void>;
  onCancel: () => void;
}

const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

export function ContactForm({ initial, submitLabel, showStage, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [language, setLanguage] = useState(initial?.language ?? "EN");
  const [source, setSource] = useState<LeadSource>(initial?.source ?? "Website");
  const [stage, setStage] = useState<StageId>(initial?.stage ?? "new");
  const [budgetMin, setBudgetMin] = useState(initial?.budgetMin?.toString() ?? "");
  const [budgetMax, setBudgetMax] = useState(initial?.budgetMax?.toString() ?? "");
  const [areas, setAreas] = useState<string[]>(initial?.areas ?? []);
  const [types, setTypes] = useState<PropertyType[]>(initial?.propertyTypes ?? []);
  const [bedrooms, setBedrooms] = useState(initial?.bedroomsMin?.toString() ?? "");
  const [followUp, setFollowUp] = useState(initial?.nextFollowUpAt ?? "");
  const [arrival, setArrival] = useState(initial?.arrivalDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    if (!name.trim()) return setError("Add the buyer's name.");
    if (!email.trim() && !phone.trim()) return setError("Add an email or a phone number so you can reach this buyer.");
    const min = num(budgetMin);
    const max = num(budgetMax);
    if (min && max && min > max) return setError("Minimum budget is higher than maximum budget.");

    setSaving(true);
    const problem = await onSubmit({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      language,
      source,
      stage,
      budgetMin: min,
      budgetMax: max,
      areas,
      propertyTypes: types,
      bedroomsMin: num(bedrooms),
      nextFollowUpAt: followUp || undefined,
      arrivalDate: arrival || undefined,
      lastContactAt: initial?.lastContactAt,
    });
    setSaving(false);
    if (problem) setError(problem);
  }

  const toggleType = (t: PropertyType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <form onSubmit={submit} className="flex flex-col" noValidate>
      <div className="grid gap-5 p-5">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="sr-only">Contact details</legend>
          <div className="sm:col-span-2">
            <label htmlFor="crm-name" className={labelClass}>Name</label>
            <input id="crm-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Whitfield" autoFocus />
          </div>
          <div>
            <label htmlFor="crm-email" className={labelClass}>Email</label>
            <input id="crm-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="crm-phone" className={labelClass}>Phone or WhatsApp</label>
            <input id="crm-phone" type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 …" />
          </div>
          <div>
            <label htmlFor="crm-lang" className={labelClass}>Language</label>
            <select id="crm-lang" className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="crm-source" className={labelClass}>Came from</label>
            <select id="crm-source" className={inputClass} value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
              {LEAD_SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </fieldset>

        <fieldset className="grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
          <legend className="mb-3 text-sm font-medium">What they're looking for</legend>
          <div>
            <label htmlFor="crm-bmin" className={labelClass}>Budget from (€)</label>
            <input id="crm-bmin" inputMode="numeric" className={inputClass} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value.replace(/\D/g, ""))} placeholder="200000" />
          </div>
          <div>
            <label htmlFor="crm-bmax" className={labelClass}>Budget to (€)</label>
            <input id="crm-bmax" inputMode="numeric" className={inputClass} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value.replace(/\D/g, ""))} placeholder="300000" />
          </div>
          <div>
            <label htmlFor="crm-beds" className={labelClass}>Bedrooms, at least</label>
            <input id="crm-beds" inputMode="numeric" className={inputClass} value={bedrooms} onChange={(e) => setBedrooms(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="crm-areas" className={labelClass}>Areas</label>
            <LocationInput id="crm-areas" multiple values={areas} onChange={setAreas} placeholder="Altea, La Zenia, Finestrat…" />
          </div>
          <div className="sm:col-span-3">
            <span className={labelClass}>Property type</span>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((t) => {
                const on = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleType(t)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>

        <fieldset className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
          <legend className="sr-only">Pipeline</legend>
          {showStage && (
            <div>
              <label htmlFor="crm-stage" className={labelClass}>Stage</label>
              <select id="crm-stage" className={inputClass} value={stage} onChange={(e) => setStage(e.target.value as StageId)}>
                {ACTIVE_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="crm-follow" className={labelClass}>Next follow-up</label>
            <input id="crm-follow" type="date" className={inputClass} value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </div>
          <div>
            <label htmlFor="crm-arrival" className={labelClass}>Arrives in Spain</label>
            <input id="crm-arrival" type="date" className={inputClass} value={arrival} onChange={(e) => setArrival(e.target.value)} />
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background px-5 py-3">
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </footer>
    </form>
  );
}
