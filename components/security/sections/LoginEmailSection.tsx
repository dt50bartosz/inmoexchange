"use client";

import { useMemo, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import PanelSection from "@/components/panel/PanelSection";
import FormField from "@/components/panel/FormField";
import { emailChangeSchema, type EmailChangeValues } from "@/lib/schemas/security";
import { focusFirstInvalid } from "@/components/panel/mock";
import PasswordInput from "../PasswordInput";
import type { SecurityActionResult, SecurityActions } from "../types";

type Props = {
  email: string;
  pendingEmail: string | null;
  onPendingChange: (email: string | null) => void;
  actions: Pick<SecurityActions, "requestEmailChange" | "resendEmailChange" | "cancelEmailChange">;
};

export default function LoginEmailSection({ email, pendingEmail, onPendingChange, actions }: Props) {
  const t = useTranslations("panel.security.email");
  const te = useTranslations("panel.security.errors");
  const failed = (res?: SecurityActionResult) =>
    toast.error(te(res && !res.ok && (res.error === "rate_limited" || res.error === "email_failed") ? res.error : "failed"));
  const formRef = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<null | "resend" | "cancel">(null);

  const schema = useMemo(() => emailChangeSchema(email), [email]);

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { newEmail: "", password: "" }, mode: "onTouched" });
  const { register, handleSubmit, formState, reset, setError } = form;
  const e = formState.errors;

  const close = () => {
    setEditing(false);
    reset();
  };

  const send = handleSubmit(
    async (values) => {
      // The server emails a link to the new address and a notice to the old one
      const res = await actions.requestEmailChange(values).catch(() => undefined);
      if (res?.ok) {
        close();
        onPendingChange(values.newEmail.trim().toLowerCase());
        toast.success(t("linkSent", { email: values.newEmail }));
        return;
      }
      if (res?.fieldErrors) {
        for (const [path, message] of Object.entries(res.fieldErrors)) {
          setError(path as FieldPath<EmailChangeValues>, { type: "server", message });
        }
        focusFirstInvalid(formRef.current);
      } else failed(res);
    },
    () => focusFirstInvalid(formRef.current)
  );

  const resend = async () => {
    setBusy("resend");
    const res = await actions.resendEmailChange().catch(() => undefined);
    setBusy(null);
    if (res?.ok) toast.success(t("linkResent"));
    else failed(res);
  };

  const cancelChange = async () => {
    setBusy("cancel");
    const res = await actions.cancelEmailChange().catch(() => undefined);
    setBusy(null);
    if (!res?.ok) return failed(res);
    onPendingChange(null);
    toast.success(t("changeCancelled"));
  };

  return (
    <PanelSection title={t("title")} description={t("description")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{email}</p>
          <p className="text-sm text-muted-foreground">{t("current")}</p>
        </div>
        {!editing && !pendingEmail && (
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            {t("change")}
          </Button>
        )}
      </div>

      {pendingEmail && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <p>{t.rich("pending", { email: pendingEmail, current: email, strong: (c) => <strong className="font-semibold">{c}</strong> })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="link" size="sm" className="px-0" onClick={resend} disabled={busy !== null}>
              {busy === "resend" ? t("sending") : t("resend")}
            </Button>
            <Button type="button" variant="link" size="sm" className="px-0" onClick={cancelChange} disabled={busy !== null}>
              {busy === "cancel" ? t("cancelling") : t("cancelChange")}
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <form ref={formRef} noValidate onSubmit={send} className="mt-5 grid max-w-md gap-4">
          <FormField label={t("new")} required error={e.newEmail?.message}>
            {(p) => <Input {...p} type="email" autoComplete="email" autoFocus {...register("newEmail")} />}
          </FormField>
          <FormField label={t("password")} required hint={t("passwordHint")} error={e.password?.message}>
            {(p) => <PasswordInput {...p} autoComplete="current-password" {...register("password")} />}
          </FormField>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? t("sending") : t("send")}
            </Button>
            <Button type="button" variant="outline" onClick={close} disabled={formState.isSubmitting}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}
    </PanelSection>
  );
}
