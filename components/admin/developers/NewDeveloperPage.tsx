"use client";

import { useRef, useState, useTransition } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import FormField from "@/components/panel/FormField";
import PanelCard from "@/components/panel/PanelCard";
import PanelSection from "@/components/panel/PanelSection";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { useUnsavedWarning } from "@/components/panel/useUnsavedWarning";
import { focusFirstInvalid } from "@/components/panel/mock";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { newDeveloperSchema } from "@/lib/schemas/developers";
import type { AdminOption, DeveloperProfileValues, NewDeveloperValues } from "@/types/developers";
import { convertToDeveloperAction, createDeveloperAction } from "@/app/[locale]/admin/promotores/server/actions";
import AdminPage from "../ui/AdminPage";
import { loginEmailToast } from "../ui/loginEmailToast";
import DeveloperFields, { EMPTY_DEVELOPER } from "./DeveloperFields";

type Props = { admins: AdminOption[]; agencies: { id: string; name: string; email: string; town: string }[] };

export default function NewDeveloperPage({ admins, agencies }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [agencyId, setAgencyId] = useState("");
  const [converting, startConvert] = useTransition();
  const form = useForm<NewDeveloperValues>({
    resolver: zodResolver(newDeveloperSchema),
    defaultValues: { ...EMPTY_DEVELOPER, email: "", sendInvite: true },
    mode: "onTouched",
  });
  const { register, handleSubmit, formState, setError } = form;
  useUnsavedWarning(mode === "new" && formState.isDirty && !formState.isSubmitSuccessful);

  const onSubmit = handleSubmit(
    async (values) => {
      const res = await createDeveloperAction(values).catch(() => null);
      if (!res?.ok) {
        if (res?.error === "email_taken") {
          setError("email", { type: "server", message: "emailTaken" });
          toast.error("This email is already used by another login. To use that account, choose “Existing account” above.");
        } else toast.error("Couldn't create the developer. Try again.");
        return;
      }
      toast.success(`${values.name} added to the CRM.`);
      if (res.data.email !== "not_sent") loginEmailToast(values.email, res.data.email);
      router.push(ADMIN_ROUTES.developer(res.data.id));
    },
    () => focusFirstInvalid(formRef.current)
  );

  const convert = () =>
    startConvert(async () => {
      const res = await convertToDeveloperAction({ agencyId }).catch(() => null);
      if (!res?.ok) {
        toast.error(res?.error === "not_found" ? "That account is already a developer, or no longer exists." : "Couldn't update the account. Try again.");
        return;
      }
      toast.success("The account is now a developer.");
      router.push(ADMIN_ROUTES.developer(res.data.id));
    });

  const back = (
    <Link href={ADMIN_ROUTES.developers} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft aria-hidden className="size-4" />
      Developer CRM
    </Link>
  );

  return (
    <AdminPage title="Add developer" description="Create a new developer account, or mark an account that already exists (e.g. one that joined through the register form) as a developer." back={back}>
      <div role="radiogroup" aria-label="How to add the developer" className="mb-6 inline-flex rounded-lg border bg-card p-1">
        {(
          [
            ["new", "New account"],
            ["existing", "Existing account"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-md px-3 py-1.5 text-sm ${mode === value ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "existing" ? (
        <PanelCard>
          <PanelSection title="Existing account" description="Its login, properties and feeds stay as they are. It appears in the CRM and can manage projects in its panel.">
            {agencies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every account is already a developer.</p>
            ) : (
              <div className="grid gap-4 sm:max-w-md">
                <SimpleSelect aria-label="Account" value={agencyId} onChange={setAgencyId} placeholder="Choose an account" options={agencies.map((a) => ({ value: a.id, label: [a.name, a.town, a.email].filter(Boolean).join(" · ") }))} />
                <Button type="button" className="justify-self-start" disabled={!agencyId || converting} onClick={convert}>
                  {converting ? "Saving…" : "Mark as developer"}
                </Button>
              </div>
            )}
          </PanelSection>
        </PanelCard>
      ) : (
        <form ref={formRef} noValidate onSubmit={onSubmit}>
          <PanelCard>
            <PanelSection title="Login" description="The developer logs in to the same panel as agencies, with this email.">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Login email" required error={formState.errors.email?.message}>
                  {(p) => <Input {...p} type="email" {...register("email")} autoComplete="off" />}
                </FormField>
                <label className="flex items-start gap-2 self-end pb-2 text-sm">
                  <input type="checkbox" className="mt-0.5 size-4 accent-primary" {...register("sendInvite")} />
                  <span>
                    Email a temporary password now
                    <span className="block text-xs text-muted-foreground">Off: the account stays “Pending” until you use “Send login details”.</span>
                  </span>
                </label>
              </div>
            </PanelSection>
            <DeveloperFields form={form as unknown as UseFormReturn<DeveloperProfileValues>} admins={admins} />
          </PanelCard>
          <div className="sticky bottom-0 z-30 -mx-4 mt-6 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
            <Link href={ADMIN_ROUTES.developers} className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Link>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Creating…" : "Create developer"}
            </Button>
          </div>
        </form>
      )}
    </AdminPage>
  );
}
