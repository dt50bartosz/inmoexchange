"use client";

import { useId, type ReactNode } from "react";
import { useValidationMessage } from "@/components/panel/useValidationMessage";

export type ControlProps = {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
};

type Props = {
  label: string;
  hint?: ReactNode;
  /** Validation key from zod (see validation.ts). Translated here. */
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: ControlProps) => ReactNode;
};

export default function FormField({ label, hint, error, required, className = "", children }: Props) {
  const id = useId();
  const t = useValidationMessage();
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
      {children({ id, "aria-invalid": !!error, "aria-describedby": errId })}
      {error && (
        <p id={errId} className="mt-1.5 text-sm text-destructive">
          {t(error)}
        </p>
      )}
    </div>
  );
}
