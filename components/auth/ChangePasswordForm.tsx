"use client";

import { useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import FormField from "@/components/panel/FormField";
import PasswordInput from "@/components/security/PasswordInput";
import { focusFirstInvalid } from "@/components/panel/mock";
import LegalConsentFields, { emptyLegalConsent, legalConsentErrors, type LegalConsentValue } from "@/components/legal/LegalConsentFields";
import { ROUTES } from "@/lib/constants/routes";
import { firstLoginSchema, type FirstLoginValues } from "@/lib/schemas/auth";
import type { RegistrationAudience, RequiredLegalDoc } from "@/types/legal";
import { setNewPasswordAction } from "@/app/[locale]/change-password/server/actions";

type Props = {
  /** null for admins: no legal acceptance on their first login. */
  audience: RegistrationAudience | null;
  /** Documents in force this login hasn't accepted yet (those accepted when registering are not asked again). */
  legalDocs: RequiredLegalDoc[];
};

/**
 * First login: replaces the temporary password from the email and, for agency and developer logins, accepts the
 * legal documents still pending (versions saved, lib/server/legal-acceptances.ts) and offers the optional marketing box.
 */
export default function ChangePasswordForm({ audience, legalDocs }: Props) {
  const t = useTranslations("auth.changePassword");
  const tc = useTranslations("legalConsent");
  const formRef = useRef<HTMLFormElement>(null);
  const [legal, setLegal] = useState<LegalConsentValue>(emptyLegalConsent);
  const [legalErrors, setLegalErrors] = useState<Record<string, string>>({});
  const check = (v: LegalConsentValue) => (audience ? legalConsentErrors(legalDocs, v, false) : {});

  const form = useForm<FirstLoginValues>({
    resolver: zodResolver(firstLoginSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const { register, handleSubmit, formState, setError } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit(
    async (values) => {
      const missing = check(legal);
      setLegalErrors(missing);
      if (Object.keys(missing).length) {
        requestAnimationFrame(() => focusFirstInvalid(formRef.current));
        return;
      }
      try {
        const res = await setNewPasswordAction({ ...values, legal });
        if (res.ok) {
          toast.success(t("saved"));
          window.location.assign(ROUTES.dashboard); // full load: the session no longer says "must change"
          return;
        }
        if (res.error === "legal_outdated") {
          toast.error(tc("outdated"));
          return;
        }
        if (res.fieldErrors) {
          setLegalErrors(Object.fromEntries(Object.entries(res.fieldErrors).filter(([f]) => f.startsWith("legal."))));
          for (const [path, message] of Object.entries(res.fieldErrors)) {
            if (!path.startsWith("legal.")) setError(path as FieldPath<FirstLoginValues>, { type: "server", message });
          }
          focusFirstInvalid(formRef.current);
        } else toast.error(t("failed"));
      } catch {
        toast.error(t("failed"));
      }
    },
    () => {
      setLegalErrors(check(legal));
      focusFirstInvalid(formRef.current);
    }
  );

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-4">
      <FormField label={t("password")} hint={t("hint")} error={e.password?.message}>
        {(p) => <PasswordInput {...p} {...register("password")} autoComplete="new-password" autoFocus />}
      </FormField>
      <FormField label={t("confirm")} error={e.confirm?.message}>
        {(p) => <PasswordInput {...p} {...register("confirm")} autoComplete="new-password" />}
      </FormField>

      {audience && (
        <LegalConsentFields
          docs={legalDocs}
          audience={audience}
          value={legal}
          onChange={(v) => {
            setLegal(v);
            if (Object.keys(legalErrors).length) setLegalErrors(check(v));
          }}
          errors={legalErrors}
          hideAuthorised
          idPrefix="first-login-legal"
        />
      )}

      <Button type="submit" className="w-full" disabled={formState.isSubmitting || formState.isSubmitSuccessful}>
        {formState.isSubmitting || formState.isSubmitSuccessful ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
