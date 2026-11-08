"use client";

import { useRef } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import PanelSection from "@/components/panel/PanelSection";
import FormField from "@/components/panel/FormField";
import { PASSWORD_MIN, passwordChangeSchema as schema, type PasswordChangeValues } from "@/lib/schemas/security";
import { focusFirstInvalid } from "@/components/panel/mock";
import PasswordInput from "../PasswordInput";
import { passwordStrength } from "../passwordStrength";
import type { SecurityActions } from "../types";

const BAR = ["bg-destructive", "bg-destructive", "bg-warning", "bg-success", "bg-success"];

type Props = { changedAt: string; onChanged: (iso: string) => void; action: SecurityActions["changePassword"] };

export default function PasswordSection({ changedAt, onChanged, action }: Props) {
  const t = useTranslations("panel.security.password");
  const te = useTranslations("panel.security.errors");
  const format = useFormatter();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { current: "", next: "", confirm: "" },
    mode: "onTouched",
  });
  const { register, handleSubmit, formState, reset, watch, setError } = form;
  const e = formState.errors;
  const next = watch("next");
  const score = passwordStrength(next);

  const submit = handleSubmit(
    async (values) => {
      try {
        const res = await action(values);
        if (res.ok) {
          reset();
          onChanged(new Date().toISOString());
          toast.success(t("updated"));
          return;
        }
        if (res.fieldErrors) {
          for (const [path, message] of Object.entries(res.fieldErrors)) {
            setError(path as FieldPath<PasswordChangeValues>, { type: "server", message });
          }
          focusFirstInvalid(formRef.current);
        } else toast.error(te(res.error === "rate_limited" ? "rate_limited" : "failed"));
      } catch {
        toast.error(te("failed"));
      }
    },
    () => focusFirstInvalid(formRef.current)
  );

  return (
    <PanelSection title={t("title")} description={t("lastChanged", { when: format.relativeTime(new Date(changedAt)) })}>
      <form ref={formRef} noValidate onSubmit={submit} className="grid max-w-md gap-4">
        <FormField label={t("current")} required error={e.current?.message}>
          {(p) => <PasswordInput {...p} autoComplete="current-password" {...register("current")} />}
        </FormField>
        <div>
          <FormField label={t("new")} required hint={t("minHint", { min: PASSWORD_MIN })} error={e.next?.message}>
            {(p) => <PasswordInput {...p} autoComplete="new-password" {...register("next", { deps: ["confirm"] })} />}
          </FormField>
          {next && (
            <div className="mt-2" aria-live="polite">
              <div className="flex gap-1" aria-hidden>
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= score ? BAR[score] : "bg-muted"}`} />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("strength", { level: t(`levels.${score}`) })}</p>
            </div>
          )}
        </div>
        <FormField label={t("confirm")} required error={e.confirm?.message}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" {...register("confirm")} />}
        </FormField>
        <div>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? t("updating") : t("update")}
          </Button>
        </div>
      </form>
    </PanelSection>
  );
}
