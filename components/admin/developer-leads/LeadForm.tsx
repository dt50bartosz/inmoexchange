"use client";

import { useRef, useState } from "react";
import { Controller, useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/panel/FormField";
import PanelCard from "@/components/panel/PanelCard";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { focusFirstInvalid } from "@/components/panel/mock";
import { useUnsavedWarning } from "@/components/panel/useUnsavedWarning";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { LEAD_PHONE_TYPES, LEAD_STATUSES, developerLeadSchema, type DeveloperLeadInput } from "@/lib/schemas/developer-leads";
import type { DeveloperLead } from "@/types/developer-leads";
import { createDeveloperLeadAction, updateDeveloperLeadAction } from "@/app/[locale]/admin/promotoras-llamadas/server/actions";
import AdminPage from "../ui/AdminPage";
import { LEAD_STATUS_LABELS, PHONE_TYPE_LABELS } from "./lead-ui";

type Props = {
  /** null = Add developer. */
  lead: DeveloperLead | null;
  /** The saved next call as "2026-11-25T10:30" (Spain time), for the date-time field. */
  nextCallInput?: string;
};

const EMPTY: DeveloperLeadInput = {
  company: "",
  contactPerson: "",
  role: "",
  phones: [{ type: "mobile", number: "", label: "" }],
  email: "",
  website: "",
  area: "",
  status: "new",
  source: "",
  notes: "",
  nextCallAt: "",
};

/** Add / edit a developer to call. Numbers are saved exactly as typed; several typed numbers per developer. */
export default function LeadForm({ lead, nextCallInput = "" }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [duplicates, setDuplicates] = useState<{ id: string; text: string }[]>([]);
  const defaults: DeveloperLeadInput = lead
    ? {
        company: lead.company,
        contactPerson: lead.contactPerson,
        role: lead.role,
        phones: lead.phones.map((p) => ({ type: p.type, number: p.number, label: p.label ?? "" })),
        email: lead.email,
        website: lead.website,
        area: lead.area,
        status: lead.status,
        source: lead.source,
        notes: lead.notes,
        nextCallAt: nextCallInput,
      }
    : EMPTY;

  const form = useForm<DeveloperLeadInput>({ resolver: zodResolver(developerLeadSchema), defaultValues: defaults, mode: "onTouched" });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const phones = useFieldArray({ control, name: "phones" });
  const e = formState.errors;
  useUnsavedWarning(formState.isDirty && !formState.isSubmitSuccessful);

  const onSubmit = handleSubmit(
    async (values) => {
      setDuplicates([]);
      const res = lead ? await updateDeveloperLeadAction(lead.id, values).catch(() => null) : await createDeveloperLeadAction(values).catch(() => null);
      if (res?.ok) {
        toast.success(lead ? "Developer saved." : "Developer added.");
        reset(values);
        router.push(ADMIN_ROUTES.developerLead(lead ? lead.id : (res.data as { id: string }).id));
        return;
      }
      if (res?.error === "duplicate" && res.fieldErrors) {
        setDuplicates(Object.entries(res.fieldErrors).map(([k, text]) => ({ id: k.slice("duplicate.".length), text })));
        return;
      }
      if (res?.error === "validation_error" && res.fieldErrors) {
        for (const [path, message] of Object.entries(res.fieldErrors)) setError(path as FieldPath<DeveloperLeadInput>, { type: "server", message });
        focusFirstInvalid(formRef.current);
        return;
      }
      toast.error(res?.error === "not_found" ? "This developer no longer exists." : "Couldn't save. Try again.");
    },
    () => focusFirstInvalid(formRef.current)
  );

  const text = (name: "company" | "contactPerson" | "role" | "email" | "website" | "area" | "source", label: string, opts: { required?: boolean; hint?: string; type?: string; placeholder?: string } = {}) => (
    <FormField label={label} required={opts.required} hint={opts.hint} error={e[name]?.message}>
      {(p) => <Input {...p} type={opts.type ?? "text"} placeholder={opts.placeholder} {...register(name)} />}
    </FormField>
  );

  return (
    <AdminPage
      title={lead ? `Edit ${lead.company}` : "Add developer"}
      description="A property developer to call and invite to Colabora MLS. Phone numbers are saved exactly as you type them."
      back={
        <Link href={lead ? ADMIN_ROUTES.developerLead(lead.id) : ADMIN_ROUTES.developerLeads} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {lead ? lead.company : "Developer calls"}
        </Link>
      }
    >
      <form ref={formRef} noValidate onSubmit={onSubmit} className="grid max-w-3xl gap-6">
        {duplicates.length > 0 && (
          <div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <TriangleAlert aria-hidden className="size-4 text-warning" />
              Already in the list: not saved.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              {duplicates.map((d) => (
                <li key={d.id}>
                  <Link href={ADMIN_ROUTES.developerLead(d.id)} className="font-medium underline underline-offset-2">
                    {d.text}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <PanelCard className="grid gap-4 p-5">
          <h2 className="font-semibold">Company and contact</h2>
          {text("company", "Company", { required: true })}
          <div className="grid gap-4 sm:grid-cols-2">
            {text("contactPerson", "Contact person", { hint: "Optional" })}
            {text("role", "Role", { hint: "Optional", placeholder: "Owner, gerente, comercial…" })}
            {text("email", "Email", { hint: "Optional", type: "email" })}
            {text("website", "Website", { hint: "Optional" })}
            {text("area", "Area", { hint: "Optional", placeholder: "Torrevieja, Orihuela Costa, Murcia…" })}
            {text("source", "Source", { required: true, hint: "Where the contact came from (GDPR)", placeholder: "Website, CSV, referral…" })}
          </div>
        </PanelCard>

        <PanelCard className="grid gap-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Phone numbers</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => phones.append({ type: "mobile", number: "", label: "" })} disabled={phones.fields.length >= 10}>
              <Plus aria-hidden className="size-4" />
              Add number
            </Button>
          </div>
          {phones.fields.length === 0 && <p className="text-sm text-muted-foreground">No numbers: the developer shows as “No number” in the list.</p>}
          {phones.fields.map((f, i) => (
            <div key={f.id} className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
              <Controller
                control={control}
                name={`phones.${i}.type`}
                render={({ field }) => (
                  <SimpleSelect aria-label={`Number ${i + 1}: type`} value={field.value} onChange={field.onChange} options={LEAD_PHONE_TYPES.map((t) => ({ value: t, label: PHONE_TYPE_LABELS[t] }))} />
                )}
              />
              <div>
                <Input type="tel" placeholder="Number" aria-label={`Number ${i + 1}`} aria-invalid={!!e.phones?.[i]?.number} {...register(`phones.${i}.number`)} />
                {e.phones?.[i]?.number && <p className="mt-1 text-xs text-destructive">{e.phones[i]?.number?.message === "required" ? "Type the number" : "Not a valid phone number"}</p>}
              </div>
              <Input placeholder="Label (optional), e.g. direct line" aria-label={`Number ${i + 1}: label`} {...register(`phones.${i}.label`)} />
              <Button type="button" variant="ghost" size="icon" onClick={() => phones.remove(i)} aria-label={`Remove number ${i + 1}`} title="Remove">
                <X aria-hidden className="size-4" />
              </Button>
            </div>
          ))}
        </PanelCard>

        <PanelCard className="grid gap-4 p-5">
          <h2 className="font-semibold">Status and follow-up</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Status" error={e.status?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => <SimpleSelect id={p.id} value={field.value} onChange={field.onChange} options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))} />}
                />
              )}
            </FormField>
            <FormField label="Next call" hint="Spain time · optional" error={e.nextCallAt?.message}>
              {(p) => <Input {...p} type="datetime-local" {...register("nextCallAt")} />}
            </FormField>
          </div>
          <FormField label="Notes" hint="Optional" error={e.notes?.message}>
            {(p) => <Textarea {...p} rows={4} {...register("notes")} />}
          </FormField>
        </PanelCard>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Saving…" : lead ? "Save" : "Add developer"}
          </Button>
          <Link href={lead ? ADMIN_ROUTES.developerLead(lead.id) : ADMIN_ROUTES.developerLeads} className="inline-flex items-center px-3 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </Link>
        </div>
      </form>
    </AdminPage>
  );
}
