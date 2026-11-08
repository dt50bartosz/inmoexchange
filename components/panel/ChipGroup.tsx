"use client";

import { Check } from "lucide-react";
import { useValidationMessage } from "@/components/panel/useValidationMessage";

type Props = {
  legend: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  error?: string;
  disabled?: boolean;
};

export default function ChipGroup({ legend, options, selected, onChange, error, disabled }: Props) {
  const t = useValidationMessage();
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(o.value)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                on ? "border-primary bg-primary/10 text-foreground" : "bg-background text-muted-foreground hover:border-foreground/30"
              }`}
            >
              {on && <Check aria-hidden className="size-3.5" />}
              {o.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{t(error)}</p>}
    </fieldset>
  );
}
