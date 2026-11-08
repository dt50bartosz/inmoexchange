"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import SimpleSelect from "@/components/panel/SimpleSelect";
import LocalTime from "@/components/developers/LocalTime";
import type { DeveloperNote } from "@/types/developers";
import { deleteNoteAction, saveNoteAction } from "@/app/[locale]/admin/promotores/server/actions";
import ConfirmDialog from "../ui/ConfirmDialog";

type Props = {
  developerId: string;
  notes: DeveloperNote[];
  /** Notes can be about one project. On a project page, `fixedProjectId` is that project. */
  projects?: { id: string; name: string }[];
  fixedProjectId?: string;
};

/** Internal admin notes (the developer never sees them): add, edit, delete. */
export default function DeveloperNotes({ developerId, notes, projects = [], fixedProjectId }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [projectId, setProjectId] = useState(fixedProjectId ?? "");
  const [editing, setEditing] = useState<{ id: string; body: string; projectId: string } | null>(null);
  const [deleting, setDeleting] = useState<DeveloperNote | null>(null);
  const [busy, startTransition] = useTransition();
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  const save = (noteId: string | null, values: { body: string; projectId: string }, done: () => void) =>
    startTransition(async () => {
      const res = await saveNoteAction(developerId, noteId, values).catch(() => null);
      if (!res?.ok) {
        toast.error(res?.error === "validation_error" ? "Write the note first (up to 4,000 characters)." : "Couldn't save the note. Try again.");
        return;
      }
      done();
      toast.success("Note saved.");
      router.refresh();
    });

  const remove = (note: DeveloperNote) =>
    startTransition(async () => {
      const res = await deleteNoteAction(developerId, note.id).catch(() => null);
      if (!res?.ok) toast.error("Couldn't delete the note. Try again.");
      else {
        toast.success("Note deleted.");
        router.refresh();
      }
    });

  const projectOptions = [{ value: "none", label: "About the developer" }, ...projects.map((p) => ({ value: p.id, label: p.name }))];

  return (
    <div>
      <form
        className="mb-6 grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save(null, { body, projectId }, () => setBody(""));
        }}
      >
        <label htmlFor="new-note" className="text-sm font-medium">
          New internal note
        </label>
        <Textarea id="new-note" rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="Call notes, agreements, follow-ups… Only admins see this." />
        <div className="flex flex-wrap items-center gap-2">
          {!fixedProjectId && projects.length > 0 && (
            <SimpleSelect aria-label="About" value={projectId || "none"} onChange={(v) => setProjectId(v === "none" ? "" : v)} options={projectOptions} className="w-64" />
          )}
          <Button type="submit" disabled={busy || !body.trim()}>
            Add note
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No internal notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border p-3">
              {editing?.id === n.id ? (
                <form
                  className="grid gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    save(n.id, { body: editing.body, projectId: editing.projectId }, () => setEditing(null));
                  }}
                >
                  <Textarea rows={3} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} maxLength={4000} aria-label="Note" />
                  <div className="flex flex-wrap gap-2">
                    {!fixedProjectId && projects.length > 0 && (
                      <SimpleSelect aria-label="About" value={editing.projectId || "none"} onChange={(v) => setEditing({ ...editing, projectId: v === "none" ? "" : v })} options={projectOptions} className="w-64" />
                    )}
                    <Button type="submit" size="sm" disabled={busy || !editing.body.trim()}>
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      <LocalTime iso={n.createdAt} /> · {n.authorEmail}
                      {n.updatedAt !== n.createdAt && " · edited"}
                      {!fixedProjectId && n.projectId && <> · {projectName.get(n.projectId) ?? "deleted project"}</>}
                    </span>
                    <span className="flex gap-1">
                      <button type="button" className="rounded p-1 hover:bg-muted hover:text-foreground" aria-label="Edit note" onClick={() => setEditing({ id: n.id, body: n.body, projectId: n.projectId ?? "" })}>
                        <Pencil aria-hidden className="size-3.5" />
                      </button>
                      <button type="button" className="rounded p-1 hover:bg-muted hover:text-destructive" aria-label="Delete note" onClick={() => setDeleting(n)}>
                        <Trash2 aria-hidden className="size-3.5" />
                      </button>
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-sm">{n.body}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this note?"
        description="The note is removed for every admin. The project's update history isn't affected."
        confirmLabel="Delete note"
        destructive
        onConfirm={() => {
          if (deleting) remove(deleting);
          setDeleting(null);
        }}
      />
    </div>
  );
}
