"use client";

import { useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import FormField from "@/components/panel/FormField";
import PasswordInput from "@/components/security/PasswordInput";
import { focusFirstInvalid } from "@/components/panel/mock";
import { newPasswordSchema, type NewPasswordValues } from "@/lib/schemas/auth";
import { resetPasswordAction } from "@/app/[locale]/reset-password/[token]/server/actions";

/** New password from a "forgot password" link. */
export default function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth.reset");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"form" | "done" | "invalid">("form");
  const [error, setError] = useState<string | null>(null);

  const form = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: "", confirm: "" } });
  const { register, handleSubmit, formState } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit(
    async (values) => {
      setError(null);
      const res = await resetPasswordAction(token, values).catch(() => undefined);
      if (res?.ok) return setState("done");
      if (res?.error === "invalid") return setState("invalid");
      if (res?.fieldErrors) {
        for (const [path, message] of Object.entries(res.fieldErrors)) form.setError(path as FieldPath<NewPasswordValues>, { type: "server", message });
        focusFirstInvalid(formRef.current);
      } else setError(t("failed"));
    },
    () => focusFirstInvalid(formRef.current)
  );

  if (state === "done") {
    return (
      <div role="status" className="space-y-4">
        <p className="text-sm">{t("done")}</p>
        <Link href="/login" className={`${buttonVariants()} w-full`}>
          Log in
        </Link>
      </div>
    );
  }
  if (state === "invalid") return <InvalidResetLink />;

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <FormField label={t("password")} hint={t("hint")} error={e.password?.message}>
        {(p) => <PasswordInput {...p} {...register("password")} autoComplete="new-password" autoFocus />}
      </FormField>
      <FormField label={t("confirm")} error={e.confirm?.message}>
        {(p) => <PasswordInput {...p} {...register("confirm")} autoComplete="new-password" />}
      </FormField>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

export function InvalidResetLink() {
  const t = useTranslations("auth.reset");
  return (
    <div role="alert" className="space-y-4">
      <p className="font-medium">{t("invalidTitle")}</p>
      <p className="text-sm text-muted-foreground">{t("invalid")}</p>
      <Link href="/forgot-password" className={`${buttonVariants({ variant: "outline" })} w-full`}>
        {t("again")}
      </Link>
    </div>
  );
}
