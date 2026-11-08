"use client";

import { useId, type ReactNode } from "react";

export type ControlProps = {
  id: string;
  className: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
  required?: boolean;
};

export const inputBase =
  "block w-full rounded-md border bg-white px-3 py-2 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40";

type Props = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /** Render prop: spread the props onto your <input>, <textarea> or <select>. */
  children: (props: ControlProps) => ReactNode;
};

export default function Field({ label, hint, error, required, className = "", children }: Props) {
  const id = useId();
  const errId = error ? `${id}-err` : undefined;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          )}
        </label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children({
        id,
        required,
        "aria-invalid": !!error,
        "aria-describedby": errId,
        className: `${inputBase} ${
          error ? "border-destructive" : "border-border focus:border-primary"
        }`,
      })}
      {error && (
        <p id={errId} className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
