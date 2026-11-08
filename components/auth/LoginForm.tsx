"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import FormField from "@/components/panel/FormField";
import PasswordInput from "@/components/security/PasswordInput";
import { focusFirstInvalid } from "@/components/panel/mock";
import { loginSchema, type LoginValues } from "@/lib/schemas/auth";
import { loginAction, type LoginError } from "@/app/[locale]/login/server/actions";

type Props = {
  /** Where to go after logging in (set by proxy.ts when it sent the visitor here). */
  callbackUrl?: string;
  /** e.g. "suspended" when the session ended because the agency was suspended. */
  initialError?: string;
};

export default function LoginForm({ callbackUrl, initialError }: Props) {
  const t = useTranslations("auth.login");
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(
    initialError === "suspended" ? t("errors.suspended") : initialError === "signed_out" ? t("errors.signed_out") : null
  );

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { register, handleSubmit, formState } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit(
    async (values) => {
      setError(null);
      try {
        const res = await loginAction(values, callbackUrl);
        if (res.ok) {
          // Full page load, so every server component reads the new session
          window.location.assign(res.data.redirectTo);
          return;
        }
        const code: LoginError = res.error;
        setError(code === "validation_error" ? t("errors.invalid") : t(`errors.${code}`));
      } catch {
        setError(t("errors.server"));
      }
    },
    () => focusFirstInvalid(formRef.current)
  );

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <FormField label={t("email")} error={e.email?.message}>
        {(p) => <Input {...p} {...register("email")} type="email" autoComplete="username" inputMode="email" autoFocus />}
      </FormField>
      <FormField
        label={t("password")}
        hint={
          <Link href="/forgot-password" className="underline underline-offset-2 hover:text-foreground">
            {t("forgot")}
          </Link>
        }
        error={e.password?.message}
      >
        {(p) => <PasswordInput {...p} {...register("password")} autoComplete="current-password" />}
      </FormField>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting || formState.isSubmitSuccessful}>
        {formState.isSubmitting || formState.isSubmitSuccessful ? t("submitting") : t("submit")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/registro" className="font-medium text-foreground underline underline-offset-2">
          {t("join")}
        </Link>
      </p>
    </form>
  );
}
