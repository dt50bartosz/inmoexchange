"use client";

import { useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import FormField from "@/components/panel/FormField";
import { focusFirstInvalid } from "@/components/panel/mock";
import { forgotPasswordAction } from "@/app/[locale]/forgot-password/server/actions";

type Values = { email: string };

/** "Forgot password": the same answer whether or not the email has a login. */
export default function ForgotPasswordForm() {
  const t = useTranslations("auth.forgot");
  const formRef = useRef<HTMLFormElement>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Values>({ defaultValues: { email: "" } });
  const { register, handleSubmit, formState } = form;

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await forgotPasswordAction(values).catch(() => undefined);
    if (res?.ok) return setSentTo(values.email.trim());
    if (res?.fieldErrors) {
      for (const [path, message] of Object.entries(res.fieldErrors)) form.setError(path as FieldPath<Values>, { type: "server", message });
      focusFirstInvalid(formRef.current);
    } else setError(res?.error === "rate_limited" ? t("rateLimited") : t("failed"));
  });

  if (sentTo) {
    return (
      <div role="status" className="space-y-4">
        <p className="font-medium">{t("sentTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("sent", { email: sentTo })}</p>
        <Link href="/login" className="text-sm font-medium underline underline-offset-2">
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <FormField label={t("email")} error={formState.errors.email?.message}>
        {(p) => <Input {...p} {...register("email")} type="email" autoComplete="username" inputMode="email" autoFocus />}
      </FormField>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? t("submitting") : t("submit")}
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
          {t("back")}
        </Link>
      </p>
    </form>
  );
}
