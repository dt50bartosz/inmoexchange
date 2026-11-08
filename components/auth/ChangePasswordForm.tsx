"use client";

import { useRef } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import FormField from "@/components/panel/FormField";
import PasswordInput from "@/components/security/PasswordInput";
import { focusFirstInvalid } from "@/components/panel/mock";
import { ROUTES } from "@/lib/constants/routes";
import { newPasswordSchema, type NewPasswordValues } from "@/lib/schemas/auth";
import { setNewPasswordAction } from "@/app/[locale]/change-password/server/actions";

/** First login: the agency replaces the temporary password from the email. */
export default function ChangePasswordForm() {
  const t = useTranslations("auth.changePassword");
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: "", confirm: "" } });
  const { register, handleSubmit, formState, setError } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        const res = await setNewPasswordAction(values);
        if (res.ok) {
          toast.success(t("saved"));
          window.location.assign(ROUTES.dashboard); // full load: the session no longer says "must change"
          return;
        }
        if (res.fieldErrors) {
          for (const [path, message] of Object.entries(res.fieldErrors)) {
            setError(path as FieldPath<NewPasswordValues>, { type: "server", message });
          }
          focusFirstInvalid(formRef.current);
        } else toast.error(t("failed"));
      } catch {
        toast.error(t("failed"));
      }
    },
    () => focusFirstInvalid(formRef.current)
  );

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-4">
      <FormField label={t("password")} hint={t("hint")} error={e.password?.message}>
        {(p) => <PasswordInput {...p} {...register("password")} autoComplete="new-password" autoFocus />}
      </FormField>
      <FormField label={t("confirm")} error={e.confirm?.message}>
        {(p) => <PasswordInput {...p} {...register("confirm")} autoComplete="new-password" />}
      </FormField>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting || formState.isSubmitSuccessful}>
        {formState.isSubmitting || formState.isSubmitSuccessful ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
