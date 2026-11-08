"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FormField from "@/components/panel/FormField";
import { developerContactSchema } from "@/lib/schemas/developers";
import type { Developer, DeveloperContact, DeveloperContactValues } from "@/types/developers";
import { deleteContactAction, saveContactAction } from "@/app/[locale]/admin/promotores/server/actions";
import ConfirmDialog from "../ui/ConfirmDialog";

const EMPTY: DeveloperContactValues = { name: "", position: "", email: "", phone: "", notes: "" };

function ContactLines({ email, phone }: { email: string; phone: string }) {
  return (
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {email && (
        <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Mail aria-hidden className="size-3.5" />
          {email}
        </a>
      )}
      {phone && (
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Phone aria-hidden className="size-3.5" />
          {phone}
        </a>
      )}
    </div>
  );
}

/** The main contact (from the profile) and any extra people at the developer. */
export default function DeveloperContacts({ developer, contacts }: { developer: Developer; contacts: DeveloperContact[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<DeveloperContact | "new" | null>(null);
  const [deleting, setDeleting] = useState<DeveloperContact | null>(null);
  const [busy, startTransition] = useTransition();
  const form = useForm<DeveloperContactValues>({ resolver: zodResolver(developerContactSchema), defaultValues: EMPTY, mode: "onTouched" });
  const e = form.formState.errors;

  const openForm = (c: DeveloperContact | "new") => {
    form.reset(c === "new" ? EMPTY : { name: c.name, position: c.position, email: c.email, phone: c.phone, notes: c.notes });
    setEditing(c);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const res = await saveContactAction(developer.id, editing && editing !== "new" ? editing.id : null, values).catch(() => null);
    if (!res?.ok) {
      toast.error("Couldn't save the contact. Try again.");
      return;
    }
    toast.success("Contact saved.");
    setEditing(null);
    router.refresh();
  });

  const remove = (c: DeveloperContact) =>
    startTransition(async () => {
      const res = await deleteContactAction(developer.id, c.id).catch(() => null);
      if (!res?.ok) toast.error("Couldn't delete the contact. Try again.");
      else {
        toast.success("Contact deleted.");
        router.refresh();
      }
    });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => openForm("new")}>
          <Plus aria-hidden className="size-4" />
          Add contact
        </Button>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        <li className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <p className="font-medium">{developer.contactPerson || "No main contact set"}</p>
            <Badge variant="secondary">Main contact</Badge>
          </div>
          {developer.contactPosition && <p className="text-sm text-muted-foreground">{developer.contactPosition}</p>}
          <ContactLines email={developer.contactEmail || developer.email} phone={developer.phone} />
          <p className="mt-2 text-xs text-muted-foreground">Change it with Edit developer.</p>
        </li>
        {contacts.map((c) => (
          <li key={c.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{c.name}</p>
                {c.position && <p className="text-sm text-muted-foreground">{c.position}</p>}
              </div>
              <span className="flex shrink-0 gap-1 text-muted-foreground">
                <button type="button" className="rounded p-1 hover:bg-muted hover:text-foreground" aria-label={`Edit ${c.name}`} onClick={() => openForm(c)}>
                  <Pencil aria-hidden className="size-3.5" />
                </button>
                <button type="button" className="rounded p-1 hover:bg-muted hover:text-destructive" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
                  <Trash2 aria-hidden className="size-3.5" />
                </button>
              </span>
            </div>
            <ContactLines email={c.email} phone={c.phone} />
            {c.notes && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{c.notes}</p>}
          </li>
        ))}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "Add contact" : "Edit contact"}</DialogTitle>
          </DialogHeader>
          <form id="contact-form" noValidate onSubmit={onSubmit} className="grid gap-3">
            <FormField label="Name" required error={e.name?.message}>
              {(p) => <Input {...p} {...form.register("name")} autoComplete="off" />}
            </FormField>
            <FormField label="Position" hint="Optional" error={e.position?.message}>
              {(p) => <Input {...p} {...form.register("position")} />}
            </FormField>
            <FormField label="Email" hint="Optional" error={e.email?.message}>
              {(p) => <Input {...p} type="email" {...form.register("email")} autoComplete="off" />}
            </FormField>
            <FormField label="Phone" hint="Optional" error={e.phone?.message}>
              {(p) => <Input {...p} type="tel" {...form.register("phone")} autoComplete="off" />}
            </FormField>
            <FormField label="Notes" hint="Optional" error={e.notes?.message}>
              {(p) => <Textarea {...p} rows={2} {...form.register("notes")} />}
            </FormField>
          </form>
          <DialogFooter>
            <Button type="submit" form="contact-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name ?? "contact"}?`}
        description="The contact is removed from this developer."
        confirmLabel="Delete contact"
        destructive
        onConfirm={() => {
          if (deleting && !busy) remove(deleting);
          setDeleting(null);
        }}
      />
    </div>
  );
}
