// lib/server/action-result.ts
// One result shape for every server action in the panel.
// Actions never throw for expected problems; they return an error code the UI can translate,
// plus fieldErrors keyed by form field ("reference", "photos.3"…) that go straight into setError().
import type { ZodError } from "zod";

export type ActionResult<T, E extends string = CommonError> =
  | { ok: true; data: T }
  | { ok: false; error: E; fieldErrors?: Record<string, string> };

/** Errors any action can return. Features add their own codes, e.g. "photos_failed". */
export type CommonError = "validation_error" | "not_found" | "server_error";

export const ok = <T>(data: T) => ({ ok: true as const, data });

export const fail = <E extends string>(error: E, fieldErrors?: Record<string, string>) =>
  ({ ok: false as const, error, ...(fieldErrors ? { fieldErrors } : {}) });

/** Zod issues → { "field.path": "message" }, first issue per field. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[issue.path.join(".")] ??= issue.message;
  return out;
}
