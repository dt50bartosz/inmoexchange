"use client";

import { useRef } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ExternalLink, Pencil, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/panel/FormField";
import PanelCard from "@/components/panel/PanelCard";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { focusFirstInvalid } from "@/components/panel/mock";
import LocalTime from "@/components/developers/LocalTime";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { LEAD_STATUSES, logCallSchema, type LogCallInput } from "@/lib/schemas/developer-leads";
import type { DeveloperLead } from "@/types/developer-leads";
import { logCallAction } from "@/app/[locale]/admin/promotoras-llamadas/[id]/server/actions";
import AdminPage from "../ui/AdminPage";
import { LEAD_STATUS_LABELS, LeadStatusBadge, PHONE_TYPE_LABELS, PhoneLink } from "./lead-ui";

const NO_NUMBER = "__none__";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** One developer: details, numbers to call, the call history (newest first) and the "Log call" form. */
export default function LeadDetail({ lead, due }: { lead: DeveloperLead; due: boolean }) {
  // The number to call first (same type and number as mainPhone: the objects differ after leaving the server)
  const mainIndex = lead.mainPhone ? lead.phones.findIndex((p) => p.type === lead.mainPhone!.type && p.number === lead.mainPhone!.number) : -1;
  return (
    <AdminPage
      title={lead.company}
      description={[lead.contactPerson, lead.role, lead.area].filter(Boolean).join(" · ") || undefined}
      back={
        <Link href={ADMIN_ROUTES.developerLeads} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Developer calls
        </Link>
      }
      actions={
        <Link href={ADMIN_ROUTES.editDeveloperLead(lead.id)} className={buttonVariants({ variant: "outline" })}>
          <Pencil aria-hidden className="size-4" />
          Edit
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <PanelCard className="p-5">
            <h2 className="mb-3 font-semibold">Numbers</h2>
            {lead.phones.length === 0 ? (
              <p className="text-sm text-destructive">No number yet. Add one with Edit.</p>
            ) : (
              <ul className="grid gap-3">
                {lead.phones.map((p, i) => (
                  <li key={`${p.number}-${i}`} className="flex items-start justify-between gap-3">
                    <PhoneLink phone={p} />
                    {i === mainIndex && <span className="shrink-0 text-xs text-muted-foreground">Call first</span>}
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>

          <PanelCard className="p-5">
            <h2 className="mb-1 font-semibold">Details</h2>
            <dl className="divide-y">
              <Row label="Status">
                <LeadStatusBadge status={lead.status} />
              </Row>
              <Row label="Next call">
                <span className={due ? "font-medium text-warning" : undefined}>
                  <LocalTime iso={lead.nextCallAt} mode="dateTime" empty="Not set" />
                  {due && " · due"}
                </span>
              </Row>
              <Row label="Contact person">{lead.contactPerson || "—"}</Row>
              <Row label="Role">{lead.role || "—"}</Row>
              <Row label="Email">
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="hover:underline">
                    {lead.email}
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Website">
                {lead.website ? (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                    {lead.website.replace(/^https?:\/\//, "")}
                    <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                ) : (
                  "—"
                )}
              </Row>
              <Row label="Area">{lead.area || "—"}</Row>
              <Row label="Source">{lead.source}</Row>
              <Row label="Added">
                <LocalTime iso={lead.createdAt} mode="date" />
              </Row>
            </dl>
            {lead.notes && (
              <div className="mt-3 border-t pt-3">
                <h3 className="mb-1 text-sm text-muted-foreground">Notes</h3>
                <p className="text-sm whitespace-pre-line">{lead.notes}</p>
              </div>
            )}
          </PanelCard>
        </div>

        <div className="grid content-start gap-6">
          <LogCallForm lead={lead} />

          <PanelCard className="p-5">
            <h2 className="mb-3 font-semibold">
              Call history <span className="text-sm font-normal text-muted-foreground">({lead.callLog.length})</span>
            </h2>
            {lead.callLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">Never called.</p>
            ) : (
              <ol className="grid gap-4">
                {lead.callLog.map((c, i) => (
                  <li key={`${c.date}-${i}`} className="border-l-2 pl-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <LocalTime iso={c.date} mode="dateTime" className="font-medium" />
                      <LeadStatusBadge status={c.outcome} />
                    </div>
                    {c.numberUsed && <p className="mt-0.5 text-xs text-muted-foreground">Called {c.numberUsed}</p>}
                    {c.note && <p className="mt-1 text-sm whitespace-pre-line">{c.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </PanelCard>
        </div>
      </div>
    </AdminPage>
  );
}

/** "Log call": number used (one of the developer's), outcome, note and an optional callback date. */
function LogCallForm({ lead }: { lead: DeveloperLead }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const empty: LogCallInput = { numberUsed: lead.mainPhone?.number ?? "", outcome: "no_answer", note: "", nextCallAt: "" };
  const form = useForm<LogCallInput>({ resolver: zodResolver(logCallSchema), defaultValues: empty });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const e = formState.errors;
  const outcome = useWatch({ control, name: "outcome" });

  const onSubmit = handleSubmit(
    async (values) => {
      const res = await logCallAction(lead.id, values).catch(() => null);
      if (res?.ok) {
        toast.success("Call logged.");
        reset({ ...empty, numberUsed: values.numberUsed });
        router.refresh();
        return;
      }
      if (res?.fieldErrors) {
        for (const [path, message] of Object.entries(res.fieldErrors)) setError(path as FieldPath<LogCallInput>, { type: "server", message });
        focusFirstInvalid(formRef.current);
        return;
      }
      toast.error(res?.error === "not_found" ? "This developer no longer exists." : "Couldn't log the call. Try again.");
    },
    () => focusFirstInvalid(formRef.current)
  );

  return (
    <PanelCard className="p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <PhoneCall aria-hidden className="size-4" />
        Log call
      </h2>
      <form ref={formRef} noValidate onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Number used" error={e.numberUsed?.message}>
            {(p) => (
              <Controller
                control={control}
                name="numberUsed"
                render={({ field }) => (
                  <SimpleSelect
                    id={p.id}
                    value={field.value || NO_NUMBER}
                    onChange={(v) => field.onChange(v === NO_NUMBER ? "" : v)}
                    options={[
                      ...lead.phones.map((ph) => ({ value: ph.number, label: `${ph.number} · ${PHONE_TYPE_LABELS[ph.type]}${ph.label ? ` (${ph.label})` : ""}` })),
                      { value: NO_NUMBER, label: "Not recorded" },
                    ]}
                  />
                )}
              />
            )}
          </FormField>
          <FormField label="Outcome" error={e.outcome?.message}>
            {(p) => (
              <Controller
                control={control}
                name="outcome"
                render={({ field }) => <SimpleSelect id={p.id} value={field.value} onChange={field.onChange} options={LEAD_STATUSES.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }))} />}
              />
            )}
          </FormField>
        </div>
        <FormField label="Note" hint="Optional" error={e.note?.message}>
          {(p) => <Textarea {...p} rows={3} placeholder="What was said, who to ask for next time…" {...register("note")} />}
        </FormField>
        <FormField
          label="Call back on"
          required={outcome === "callback"}
          hint={outcome === "callback" ? "Spain time" : "Spain time · optional; empty clears the next call"}
          error={e.nextCallAt?.message}
        >
          {(p) => <Input {...p} type="datetime-local" {...register("nextCallAt")} />}
        </FormField>
        <Button type="submit" className="justify-self-start" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Saving…" : "Log call"}
        </Button>
      </form>
    </PanelCard>
  );
}
