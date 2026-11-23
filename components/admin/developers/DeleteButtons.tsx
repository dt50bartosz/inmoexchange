"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { deleteDeveloperAction, deleteProjectAction } from "@/app/[locale]/admin/promotores/server/actions";
import ConfirmDialog from "../ui/ConfirmDialog";

/*
 * Trash-icon buttons for the admin lists (Developer CRM, All projects, a developer's Projects tab).
 * Same server actions as the project page and the Account tab, so the same rules apply:
 * a developer with client registrations by agencies is cancelled instead of deleted.
 */

function TrashButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={disabled} onClick={onClick} aria-label={label} title={label}>
      <Trash2 aria-hidden className="size-4" />
    </Button>
  );
}

export function DeleteProjectButton({ project }: { project: { id: string; name: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const res = await deleteProjectAction(project.id).catch(() => null);
      if (!res?.ok) {
        toast.error(res?.error === "not_found" ? "This project no longer exists." : "Couldn't delete the project. Try again.");
        return;
      }
      toast.success(`${project.name} deleted.`);
      router.refresh();
    });

  return (
    <>
      <TrashButton label={`Delete ${project.name}`} disabled={busy} onClick={() => setOpen(true)} />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${project.name}?`}
        description="The development, its units, images, documents and notes are deleted permanently. The update history is kept. If agencies have registered clients for it, consider “Back to draft” on the project page instead."
        confirmLabel="Delete project"
        destructive
        onConfirm={() => {
          setOpen(false);
          remove();
        }}
      />
    </>
  );
}

export function DeleteDeveloperButton({ developer }: { developer: { id: string; name: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const res = await deleteDeveloperAction(developer.id).catch(() => null);
      if (!res?.ok) {
        toast.error(res?.error === "not_found" ? "This developer no longer exists." : "Couldn't delete the developer. Try again.");
        return;
      }
      if (res.data.cancelled) toast.success(`${developer.name} has client registrations by agencies, so the account was cancelled instead of deleted.`);
      else toast.success(`${developer.name} deleted.`);
      router.refresh();
    });

  return (
    <>
      <TrashButton label={`Delete ${developer.name}`} disabled={busy} onClick={() => setOpen(true)} />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${developer.name}?`}
        description="The account, its login, developments, units, images, contacts and internal notes are deleted permanently. The update history is kept. If agencies have registered clients with this developer, the account is cancelled instead (no login, developments hidden, everything kept)."
        confirmLabel="Delete developer"
        destructive
        onConfirm={() => {
          setOpen(false);
          remove();
        }}
      />
    </>
  );
}
