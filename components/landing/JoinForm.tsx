"use client";

import { useRef, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import type { z } from "zod";
import { CheckCircle2, Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/Input";
import LocationInput from "@/components/panel/LocationInput";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { Button } from "@/components/ui/Button";
import { Container, Section, SectionHeading } from "@/components/ui/Layout";
import FormField from "@/components/panel/FormField";
import { focusFirstInvalid } from "@/components/panel/mock";
import { SPANISH_PROVINCES } from "@/lib/constants/provinces";
import { PAYMENT_FREQUENCIES, PREFERRED_LANGUAGES, agencyApplicationSchema } from "@/lib/schemas/admin";
import { submitApplicationAction } from "@/app/[locale]/join/server/actions";
import { useValidationMessage } from "@/components/panel/useValidationMessage";

type Values = z.input<typeof agencyApplicationSchema>;

const EMPTY: Omit<Values, "preferredLanguage"> = {
  email: "",
  companyName: "",
  brandName: "",
  raicv: "",
  cif: "",
  website: "",
  street: "",
  town: "",
  province: "",
  postcode: "",
  ownerName: "",
  ownerIdNumber: "",
  contactPerson: "",
  phone: "",
  phone2: "",
  email2: "",
  crm: "",
  crmAgencyNumber: "",
  paymentFrequency: "",
  iban: "",
  acceptPrivacy: false,
  faxNumber: "",
};

/** Suggestions only: any CRM can be typed. */
const CRMS = ["Inmovilla", "Resales Online", "Witei", "eGO Real Estate", "Mobilia", "Inmoweb", "Habitat Soft", "Kyero"];

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-1 font-semibold">{title}</legend>
      {hint && <p className="-mt-2 text-sm text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

/**
 * The /join register form. Every field is stored on the application (agencyApplicationSchema) and copied
 * to the agency when the admin approves it, so nothing has to be typed twice.
 */
/** Public sign-up: agencies only (developer accounts are created by admin). */
export default function JoinForm() {
  const t = useTranslations("join");
  const tv = useValidationMessage();
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Default: no bank details (the first 6 months are free). The agency can still add them now if it wants.
  const [addBanking, setAddBanking] = useState(false);
  const toggleBanking = (on: boolean) => {
    setAddBanking(on);
    if (!on) {
      setValue("paymentFrequency", "", { shouldValidate: true });
      setValue("iban", "", { shouldValidate: true });
    }
  };
  const form = useForm<Values>({
    resolver: zodResolver(agencyApplicationSchema),
    defaultValues: { ...EMPTY, preferredLanguage: locale === "es" ? "es" : "en", accountType: "agency" },
    mode: "onTouched",
  });
  const { register, control, handleSubmit, formState, setError, setValue } = form;
  const e = formState.errors;
  const crm = useWatch({ control, name: "crm" });
  const optional = t("fields.optional");

  const onSubmit = handleSubmit(
    async (values) => {
      setServerError(null);
      try {
        const res = await submitApplicationAction(values);
        if (res.ok) {
          setSent(true);
          return;
        }
        if (res.error === "validation_error" && res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) setError(field as FieldPath<Values>, { type: "server", message });
          focusFirstInvalid(formRef.current);
        } else {
          setServerError(res.error === "rate_limited" ? t("rateLimited") : t("error"));
        }
      } catch {
        setServerError(t("error"));
      }
    },
    () => focusFirstInvalid(formRef.current)
  );

  const text = (name: Exclude<FieldPath<Values>, "acceptPrivacy" | "preferredLanguage" | "paymentFrequency">, opts: { required?: boolean; type?: string; autoComplete?: string; hint?: string; placeholder?: string; className?: string } = {}) => (
    <FormField label={t(`fields.${name}`)} required={opts.required} hint={opts.hint ?? (opts.required ? undefined : optional)} error={e[name]?.message} className={opts.className}>
      {(p) => <Input {...p} type={opts.type ?? "text"} autoComplete={opts.autoComplete ?? "off"} placeholder={opts.placeholder} {...register(name)} />}
    </FormField>
  );

  return (
    <Section id="join" tone="surface">
      <Container className="max-w-3xl">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <Card className="shadow-md">
          {sent ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center" role="status">
              <CheckCircle2 aria-hidden className="size-10 text-success" />
              <h2 className="text-xl font-semibold">{t("sentTitle")}</h2>
              <p className="max-w-md text-muted-foreground">{t("sentBody")}</p>
            </div>
          ) : (
            <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-8 p-6 sm:p-8">
              <Controller
                control={control}
                name="preferredLanguage"
                render={({ field }) => (
                  <div role="radiogroup" aria-label={t("language")} className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">{t("language")}</span>
                    <div className="inline-flex rounded-md border p-0.5">
                      {PREFERRED_LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          role="radio"
                          aria-checked={field.value === lang}
                          onClick={() => field.onChange(lang)}
                          className={`rounded px-3 py-1 text-sm font-medium uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            field.value === lang ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              />

              <Group title={t("sections.company")}>
                <div className="grid gap-4 md:grid-cols-2">
                  {text("email", { required: true, type: "email", autoComplete: "email", hint: t("fields.emailHint"), className: "md:col-span-2" })}
                  {text("companyName", { required: true, autoComplete: "organization" })}
                  {text("brandName", { hint: t("fields.brandNameHint") })}
                  {text("raicv")}
                  {text("cif")}
                  {text("website", { type: "url", autoComplete: "url", placeholder: "https://", className: "md:col-span-2" })}
                </div>
              </Group>

              <Group title={t("sections.address")}>
                <div className="grid gap-4 md:grid-cols-2">
                  {text("street", { autoComplete: "street-address", className: "md:col-span-2" })}
                  <FormField label={t("fields.town")} required error={e.town?.message}>
                    {(p) => (
                      <Controller
                        control={control}
                        name="town"
                        render={({ field }) => (
                          <LocationInput
                            {...p}
                            placeholder="Torrevieja"
                            value={field.value ?? ""}
                            onChange={(value, location) => {
                              field.onChange(value);
                              // A suggested town also fills in its province
                              const province = location && SPANISH_PROVINCES.find((n) => n.startsWith(location.province));
                              if (province) setValue("province", province, { shouldValidate: true });
                            }}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  <FormField label={t("fields.province")} required error={e.province?.message}>
                    {(p) => (
                      <Controller
                        control={control}
                        name="province"
                        render={({ field }) => (
                          <SimpleSelect
                            {...p}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t("fields.provincePlaceholder")}
                            options={SPANISH_PROVINCES.map((n) => ({ value: n, label: n }))}
                          />
                        )}
                      />
                    )}
                  </FormField>
                  {text("postcode", { required: true, autoComplete: "postal-code" })}
                </div>
              </Group>

              <Group title={t("sections.people")}>
                <div className="grid gap-4 md:grid-cols-2">
                  {text("ownerName")}
                  {text("ownerIdNumber")}
                  {text("contactPerson", { required: true, autoComplete: "name" })}
                  {text("phone", { required: true, type: "tel", autoComplete: "tel" })}
                  {text("phone2", { type: "tel" })}
                  {text("email2", { type: "email" })}
                </div>
              </Group>

              <Group title={t("sections.crm")}>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField label={t("fields.crm")} hint={optional} error={e.crm?.message}>
                    {(p) => (
                      <>
                        <Input {...p} list="join-crms" placeholder={t("fields.crmPlaceholder")} autoComplete="off" {...register("crm")} />
                        <datalist id="join-crms">
                          {CRMS.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </>
                    )}
                  </FormField>
                  {/* Only Inmovilla agencies have this number */}
                  {/inmovilla/i.test(crm ?? "") ? text("crmAgencyNumber") : <div className="hidden md:block" />}
                  {addBanking ? (
                    <>
                      <FormField label={t("fields.paymentFrequency")} hint={optional} error={e.paymentFrequency?.message}>
                        {(p) => (
                          <Controller
                            control={control}
                            name="paymentFrequency"
                            render={({ field }) => (
                              <SimpleSelect
                                {...p}
                                value={field.value ?? ""}
                                onChange={(v) => field.onChange(v)}
                                placeholder={t("fields.paymentPlaceholder")}
                                options={PAYMENT_FREQUENCIES.map((v) => ({ value: v, label: t(`payment.${v}`) }))}
                              />
                            )}
                          />
                        )}
                      </FormField>
                      {text("iban", { hint: t("fields.ibanHint"), placeholder: "ES00 0000 0000 0000 0000 0000" })}
                      <button type="button" onClick={() => toggleBanking(false)} className="justify-self-start text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground md:col-span-2">
                        {t("fields.removeBanking")}
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-dashed px-4 py-3 text-sm md:col-span-2">
                      <Landmark aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 font-medium">{t("fields.noBanking")}</span>
                      <button type="button" onClick={() => toggleBanking(true)} className="text-sm font-medium text-primary underline underline-offset-4 hover:no-underline">
                        {t("fields.addBanking")}
                      </button>
                    </div>
                  )}
                </div>
              </Group>

              <Controller
                control={control}
                name="acceptPrivacy"
                render={({ field }) => (
                  <div>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        onBlur={field.onBlur}
                        aria-invalid={!!e.acceptPrivacy}
                        aria-describedby={e.acceptPrivacy ? "join-privacy-err" : undefined}
                        className="mt-0.5"
                      />
                      <span>
                        {t("fields.acceptPrivacy")}
                        <span className="ml-0.5 text-destructive" aria-hidden>
                          *
                        </span>
                      </span>
                    </label>
                    {e.acceptPrivacy?.message && (
                      <p id="join-privacy-err" className="mt-1.5 text-sm text-destructive">
                        {tv(e.acceptPrivacy.message)}
                      </p>
                    )}
                  </div>
                )}
              />

              {/* Spam trap: hidden from people and screen readers; bots fill it in */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="faxNumber">Fax</label>
                <input id="faxNumber" tabIndex={-1} autoComplete="off" {...register("faxNumber")} />
              </div>

              {serverError && (
                <p className="text-sm text-destructive" role="alert">
                  {serverError}
                </p>
              )}
              <Button type="submit" size="lg" className="justify-self-start" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? t("submitting") : t("submit")}
              </Button>
            </form>
          )}
        </Card>
      </Container>
    </Section>
  );
}
