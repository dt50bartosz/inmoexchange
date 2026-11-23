"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import type { RegistrationAudience, RequiredLegalDoc } from "@/types/legal";

/** What the server action receives (legalConsentInputSchema in lib/server/legal-acceptances.ts). */
export type LegalConsentValue = { accepted: Record<string, string>; marketing: boolean; authorised: boolean };

export const emptyLegalConsent = (): LegalConsentValue => ({ accepted: {}, marketing: false, authorised: false });

/** Browser check before sending (the server checks again): every document and the authorisation ticked. */
export function legalConsentErrors(docs: RequiredLegalDoc[], v: LegalConsentValue, needsAuthorised = true): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of docs) if (v.accepted[d.key] !== d.version) out[`legal.${d.key}`] = "acceptRequired";
  if (needsAuthorised && !v.authorised) out["legal.authorised"] = "acceptRequired";
  return out;
}

type Props = {
  docs: RequiredLegalDoc[];
  audience: RegistrationAudience;
  value: LegalConsentValue;
  onChange: (v: LegalConsentValue) => void;
  /** Keys "legal.<docKey>" / "legal.authorised" (from legalConsentErrors or the server). */
  errors?: Record<string, string>;
  /** First login of an account created by an admin: no "authorised to register" box. */
  hideAuthorised?: boolean;
  /** For ids, when two forms could be on one page. */
  idPrefix?: string;
};

/**
 * The registration consent boxes: one mandatory box per legal document in force (with its version and a link that opens it),
 * the "authorised to register the company" box, and the optional marketing box. Nothing is pre-ticked, and marketing
 * is never required.
 */
export default function LegalConsentFields({ docs, audience, value, onChange, errors = {}, hideAuthorised, idPrefix = "legal" }: Props) {
  const t = useTranslations("legalConsent");
  const td = useTranslations("legal.docs");

  const link = (d: RequiredLegalDoc) => (chunks: React.ReactNode) => (
    <a href={`${d.path}?version=${encodeURIComponent(d.version)}`} target="_blank" rel="noopener" className="font-medium text-primary underline underline-offset-2 hover:no-underline">
      {chunks}
    </a>
  );

  const box = (id: string, checked: boolean, set: (on: boolean) => void, label: React.ReactNode, required: boolean, errorKey?: string, hint?: string) => {
    const err = errorKey ? errors[errorKey] : undefined;
    return (
      <div key={id}>
        <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm">
          <Checkbox
            id={id}
            checked={checked}
            onCheckedChange={(c) => set(c === true)}
            aria-invalid={!!err}
            aria-describedby={err ? `${id}-err` : hint ? `${id}-hint` : undefined}
            className="mt-0.5"
          />
          <span>
            {label}
            {required ? (
              <span className="ml-0.5 text-destructive" aria-hidden>
                *
              </span>
            ) : (
              <span className="ml-1 text-muted-foreground">{t("optional")}</span>
            )}
            {hint && (
              <span id={`${id}-hint`} className="block text-xs text-muted-foreground">
                {hint}
              </span>
            )}
          </span>
        </label>
        {err && (
          <p id={`${id}-err`} className="mt-1.5 ml-6.5 text-sm text-destructive">
            {t("required")}
          </p>
        )}
      </div>
    );
  };

  const setDoc = (d: RequiredLegalDoc, on: boolean) => {
    const accepted = { ...value.accepted };
    if (on) accepted[d.key] = d.version;
    else delete accepted[d.key];
    onChange({ ...value, accepted });
  };

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 font-semibold">{t("legend")}</legend>
      {docs.map((d) =>
        box(
          `${idPrefix}-${d.key}`,
          value.accepted[d.key] === d.version,
          (on) => setDoc(d, on),
          d.key === "terms"
            ? t.rich("terms", { link: link(d), version: d.version })
            : d.key === "privacy"
              ? t.rich("privacy", { link: link(d), version: d.version })
              : t.rich("document", { link: link(d), title: td(d.key), version: d.version }),
          true,
          `legal.${d.key}`
        )
      )}
      {!hideAuthorised &&
        box(`${idPrefix}-authorised`, value.authorised, (on) => onChange({ ...value, authorised: on }), t(`authorised.${audience}`), true, "legal.authorised")}
      {box(`${idPrefix}-marketing`, value.marketing, (on) => onChange({ ...value, marketing: on }), t("marketing"), false, undefined, t("marketingHint"))}
    </fieldset>
  );
}
