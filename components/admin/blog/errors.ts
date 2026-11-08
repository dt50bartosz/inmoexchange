import type { ZodError } from "zod";

/** Zod issues → { "translations.es.title": "required" }, first issue per field (same shape as the server's fieldErrors). */
export function zodIssuesToErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[issue.path.join(".")] ??= issue.message;
  return out;
}
