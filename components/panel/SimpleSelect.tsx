"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
};

/** shadcn (Base UI) Select with a plain value/onChange API. */
export default function SimpleSelect({ value, onChange, options, id, placeholder, disabled, className = "w-full", ...aria }: Props) {
  return (
    <Select
      items={options}
      value={value === "" ? null : value}
      onValueChange={(v) => onChange(v == null ? "" : String(v))}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className} {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
