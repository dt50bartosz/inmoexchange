"use client";

import { useRef } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/panel/FormField";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { focusFirstInvalid } from "@/components/panel/mock";
import { ctaPrimary } from "@/components/developers-landing/styles";
import {
  ACTIVE_DEVELOPMENTS,
  DEVELOPER_MESSAGE_MAX,
  developerApplicationSchema,
  type ActiveDevelopments,
  type DeveloperApplicationInput,
} from "@/lib/schemas/developer-application";
import { submitDeveloperApplicationAction } from "./server/actions";
import { useValidationMessage } from "@/components/panel/useValidationMessage";

const EMPTY: DeveloperApplicationInput = {
  fullName: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  // No choice yet: the schema asks to pick one
  activeDevelopments: "" as ActiveDevelopments,
  feedUrl: "",
  message: "",
  acceptTerms: false,
  faxNumber: "",
};

// Touch targets of at least 44px on this public page
const field = "h-11 bg-white";
const linkClass = "font-medium text-dev-accent underline underline-offset-4 hover:no-underline";

/** "Para promotoras" application (#solicitud). Becomes a pending developer application in Admin → Applications. */
export default function ApplicationForm() {
  const t = useTranslations("developersLanding.form");
  const tv = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm<DeveloperApplicationInput>({ resolver: zodResolver(developerApplicationSchema), defaultValues: EMPTY, mode: "onTouched" });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit(
    async (values) => {
      const res = await submitDeveloperApplicationAction(values).catch(() => null);
      if (res?.ok) {
        toast.success(t("sent"));
        reset(EMPTY);
        return;
      }
      if (res?.error === "validation_error" && res.fieldErrors) {
        for (const [name, message] of Object.entries(res.fieldErrors)) setError(name as FieldPath<DeveloperApplicationInput>, { type: "server", message });
        focusFirstInvalid(formRef.current);
        return;
      }
      toast.error(res?.error === "rate_limited" ? t("rateLimited") : t("error"));
    },
    () => focusFirstInvalid(formRef.current)
  );

  const text = (name: "fullName" | "company" | "email" | "phone" | "website", opts: { type?: string; autoComplete?: string; placeholder?: string } = {}) => (
    <FormField label={t(name)} required error={e[name]?.message}>
      {(p) => <Input {...p} type={opts.type ?? "text"} autoComplete={opts.autoComplete} placeholder={opts.placeholder} className={field} {...register(name)} />}
    </FormField>
  );

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-5 rounded-[14px] border border-dev-border bg-white p-5 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        {text("fullName", { autoComplete: "name" })}
        {text("company", { autoComplete: "organization", placeholder: t("companyPlaceholder") })}
        {text("email", { type: "email", autoComplete: "email" })}
        {text("phone", { type: "tel", autoComplete: "tel" })}
        {text("website", { autoComplete: "url", placeholder: t("websitePlaceholder") })}
        <FormField label={t("activeDevelopments")} required error={e.activeDevelopments?.message}>
          {(p) => (
            <Controller
              control={control}
              name="activeDevelopments"
              render={({ field: f }) => (
                <SimpleSelect
                  {...p}
                  value={f.value}
                  onChange={f.onChange}
                  placeholder={t("activeDevelopmentsPlaceholder")}
                  className={`w-full ${field}`}
                  options={ACTIVE_DEVELOPMENTS.map((v) => ({ value: v, label: t(`developments.${v}`) }))}
                />
              )}
            />
          )}
        </FormField>
      </div>

      <FormField label={t("feedUrl")} hint={t("feedUrlHint")} error={e.feedUrl?.message}>
        {(p) => <Input {...p} type="url" inputMode="url" autoComplete="off" placeholder="https://" className={field} {...register("feedUrl")} />}
      </FormField>

      <FormField label={t("message")} hint={t("optional")} error={e.message?.message}>
        {(p) => <Textarea {...p} rows={5} maxLength={DEVELOPER_MESSAGE_MAX} className="bg-white" {...register("message")} />}
      </FormField>

      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: f }) => (
          <div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-dev-ink">
              <Checkbox
                checked={f.value}
                onCheckedChange={(checked) => f.onChange(checked === true)}
                onBlur={f.onBlur}
                aria-invalid={!!e.acceptTerms}
                aria-describedby={e.acceptTerms ? "dev-terms-err" : undefined}
                className="mt-0.5 size-5"
              />
              <span>
                {t.rich("acceptTerms", {
                  privacy: (chunks) => (
                    <Link href="/privacidad" target="_blank" className={linkClass}>
                      {chunks}
                    </Link>
                  ),
                  terms: (chunks) => (
                    <Link href="/terminos" target="_blank" className={linkClass}>
                      {chunks}
                    </Link>
                  ),
                })}
                <span className="ml-0.5 text-destructive" aria-hidden>
                  *
                </span>
              </span>
            </label>
            {e.acceptTerms?.message && (
              <p id="dev-terms-err" className="mt-1.5 text-sm text-destructive">
                {tv(e.acceptTerms.message)}
              </p>
            )}
          </div>
        )}
      />

      {/* Spam trap: hidden from people and screen readers; bots fill it in */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="dev-fax">Fax</label>
        <input id="dev-fax" tabIndex={-1} autoComplete="off" {...register("faxNumber")} />
      </div>

      <button type="submit" disabled={formState.isSubmitting} className={`${ctaPrimary} justify-self-start disabled:opacity-60`}>
        {formState.isSubmitting ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
