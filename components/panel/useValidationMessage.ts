"use client";

import { useTranslations } from "next-intl";

/**
 * Turns a zod error message into text for the user. Schemas use keys under panel.validation (see V in
 * lib/schemas/shared.ts); anything else (zod's own English text when a rule has no message, a typo, a server
 * message) shows the general "Check this field." instead of crashing the page with a missing-message error.
 */
export function useValidationMessage() {
  const t = useTranslations("panel.validation");
  return (key: string | undefined | null): string => {
    if (!key) return "";
    return t.has(key as never) ? t(key as never) : t("invalid");
  };
}
