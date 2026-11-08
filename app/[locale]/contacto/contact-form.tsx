"use client";

import { useRef, useState, useTransition } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Container, Section } from "@/components/ui/Layout";
import FormField from "@/components/panel/FormField";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { focusFirstInvalid } from "@/components/panel/mock";
import { CONTACT_MESSAGE_MAX, CONTACT_ROLES, contactMessageSchema, type ContactMessageInput, type ContactRole } from "@/lib/schemas/contact";
import { createContactMessageAction } from "./server/create-contact-message";
import { useValidationMessage } from "@/components/panel/useValidationMessage";
import ContactPhoneButtons from "@/components/ContactPhoneButtons";

type Props = { initialRole?: ContactRole };

export default function ContactForm({ initialRole }: Props) {
  const t = useTranslations("contact");
  const tv = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<ContactMessageInput>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      // No choice yet: the schema asks to pick one
      role: initialRole ?? ("" as ContactRole),
      message: "",
      acceptPrivacy: false,
      website: "",
    },
    mode: "onTouched",
  });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit(
    (values) =>
      startTransition(async () => {
        const res = await createContactMessageAction(values).catch(() => null);
        if (res?.ok) {
          setSent(true);
          reset();
          return;
        }
        if (res?.error === "validation_error" && res.fieldErrors) {
          for (const [field, message] of Object.entries(res.fieldErrors)) setError(field as FieldPath<ContactMessageInput>, { type: "server", message });
          focusFirstInvalid(formRef.current);
          return;
        }
        toast.error(res?.error === "rate_limited" ? t("rateLimited") : t("error"));
      }),
    () => focusFirstInvalid(formRef.current)
  );

  return (
    <Section tone="surface">
      <Container className="max-w-2xl">
        {/* Same look as SectionHeading, but the page's h1 */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h1 className="text-3xl font-normal leading-tight tracking-tight text-foreground sm:text-4xl">{t("title")}</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">{t("subtitle")}</p>
          {/* Prefer to talk: our phone / WhatsApp (lib/constants/contact.ts) */}
          <p className="mt-6 text-sm font-medium">{t("preferTalk")}</p>
          <ContactPhoneButtons
            className="mt-3 justify-center"
            whatsappMessage={t("whatsappMessage")}
            labels={{ call: t("call"), whatsapp: t("whatsapp") }}
            whatsappClassName={`${buttonVariants({ size: "lg" })} h-11`}
            callClassName={`${buttonVariants({ variant: "outline", size: "lg" })} h-11`}
          />
        </div>
        <Card className="shadow-md">
          {sent ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center" role="status">
              <CheckCircle2 aria-hidden className="size-10 text-success" />
              <h2 className="text-xl font-semibold">{t("sentTitle")}</h2>
              <p className="max-w-md text-muted-foreground">{t("sentBody")}</p>
              <Button type="button" variant="outline" className="mt-2" onClick={() => setSent(false)}>
                {t("sendAnother")}
              </Button>
            </div>
          ) : (
            <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-5 p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label={t("fields.name")} required error={e.name?.message}>
                  {(p) => <Input {...p} autoComplete="name" {...register("name")} />}
                </FormField>
                <FormField label={t("fields.email")} required error={e.email?.message}>
                  {(p) => <Input {...p} type="email" autoComplete="email" {...register("email")} />}
                </FormField>
                <FormField label={t("fields.phone")} hint={t("fields.optional")} error={e.phone?.message}>
                  {(p) => <Input {...p} type="tel" autoComplete="tel" {...register("phone")} />}
                </FormField>
                <FormField label={t("fields.role")} required error={e.role?.message}>
                  {(p) => (
                    <Controller
                      control={control}
                      name="role"
                      render={({ field }) => (
                        <SimpleSelect
                          {...p}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t("fields.rolePlaceholder")}
                          options={CONTACT_ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))}
                        />
                      )}
                    />
                  )}
                </FormField>
              </div>

              <FormField label={t("fields.message")} required hint={t("fields.messageHint", { max: CONTACT_MESSAGE_MAX })} error={e.message?.message}>
                {(p) => <Textarea {...p} rows={6} maxLength={CONTACT_MESSAGE_MAX} {...register("message")} />}
              </FormField>

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
                        aria-describedby={e.acceptPrivacy ? "contact-privacy-err" : undefined}
                        className="mt-0.5"
                      />
                      <span>
                        {t.rich("fields.acceptPrivacy", {
                          link: (chunks) => (
                            <Link href="/privacidad" target="_blank" className="font-medium text-primary underline underline-offset-4 hover:no-underline">
                              {chunks}
                            </Link>
                          ),
                        })}
                        <span className="ml-0.5 text-destructive" aria-hidden>
                          *
                        </span>
                      </span>
                    </label>
                    {e.acceptPrivacy?.message && (
                      <p id="contact-privacy-err" className="mt-1.5 text-sm text-destructive">
                        {tv(e.acceptPrivacy.message)}
                      </p>
                    )}
                  </div>
                )}
              />

              {/* Spam trap: hidden from people and screen readers; bots fill it in */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" tabIndex={-1} autoComplete="off" {...register("website")} />
              </div>

              <Button type="submit" size="lg" className="justify-self-start" disabled={pending}>
                {pending ? t("submitting") : t("submit")}
              </Button>
            </form>
          )}
        </Card>
      </Container>
    </Section>
  );
}
