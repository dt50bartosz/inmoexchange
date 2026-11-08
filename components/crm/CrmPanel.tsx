"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Contact, ContactInput, StageId } from "@/types/crm";
import { ACTIVE_STAGES, STAGES } from "@/types/crm";
import { toast } from "sonner";
import { cn, isDue } from "./utils";
import { PipelineBoard } from "./PipelineBoard";
import { ContactTable } from "./ContactTable";
import { ContactDrawer } from "./ContactDrawer";
import { ContactForm } from "./ContactForm";
import { Modal } from "./Modal";
import { IconBoard, IconList, IconPlus, IconSearch } from "./icons";
import {
  addNote as addNoteAction,
  createContact,
  deleteContact,
  moveStage as moveStageAction,
  updateContact,
  type CrmResult,
} from "@/app/[locale]/panel/crm/server/actions";

/** The first field error from the server, if any (the messages are already readable). */
const firstError = (fieldErrors?: Record<string, string>) => (fieldErrors ? Object.values(fieldErrors)[0] : undefined);

/** Cleared values are sent as "" (the server treats "" as "not set"); undefined could be dropped on the way. */
const forServer = (values: Partial<Contact>) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === undefined ? "" : v]));

type View = "pipeline" | "list";

/** `initialContacts` are the agency's buyers, loaded on the server (app/[locale]/panel/crm/page.tsx). */
export default function CrmPanel({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  // The list as last rendered, to undo a change that couldn't be saved
  const latest = useRef(contacts);
  latest.current = contacts;
  const [view, setView] = useState<View>("pipeline");
  const [query, setQuery] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const dueCount = useMemo(() => contacts.filter(isDue).length, [contacts]);
  const lostCount = useMemo(() => contacts.filter((c) => c.stage === "lost").length, [contacts]);
  const activeCount = contacts.length - lostCount - contacts.filter((c) => c.stage === "closed").length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (!showLost && c.stage === "lost") return false;
      if (onlyDue && !isDue(c)) return false;
      if (!q) return true;
      return [c.name, c.email, c.phone, ...c.areas].some((v) => v?.toLowerCase().includes(q));
    });
  }, [contacts, query, onlyDue, showLost]);

  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  // ---- Mutations: saved through the server actions; the list shows what the database returned ----

  /** Puts the server's version of a buyer into the list. */
  const replace = useCallback((saved: Contact) => setContacts((prev) => prev.map((c) => (c.id === saved.id ? saved : c))), []);

  /** Shows the change at once, saves it, then shows the saved buyer, or undoes the change if saving failed. */
  const save = useCallback(
    async (id: string, preview: (c: Contact) => Contact, request: () => Promise<CrmResult>) => {
      const before = latest.current.find((c) => c.id === id);
      setContacts((prev) => prev.map((c) => (c.id === id ? preview(c) : c)));
      try {
        const res = await request();
        if (res.ok) return replace(res.data);
        toast.error(res.error === "not_found" ? "This buyer no longer exists." : firstError(res.fieldErrors) ?? "Couldn't save. Please try again.");
      } catch {
        toast.error("Couldn't save. Check your connection and try again.");
      }
      if (before) replace(before);
    },
    [replace]
  );

  const update = useCallback(
    (id: string, changes: Partial<Contact>) => void save(id, (c) => ({ ...c, ...changes }), () => updateContact(id, forServer(changes))),
    [save]
  );

  const moveStage = useCallback(
    (id: string, stage: StageId) =>
      void save(
        id,
        (c) => (c.stage === stage ? c : { ...c, stage }), // the server adds the "Moved to …" note
        () => moveStageAction(id, stage)
      ),
    [save]
  );

  const addNote = useCallback(
    (id: string, body: string) =>
      void save(
        id,
        (c) => ({ ...c, notes: [{ id: `pending-${Date.now()}`, kind: "note", body, createdAt: new Date().toISOString() }, ...c.notes] }),
        () => addNoteAction(id, body)
      ),
    [save]
  );

  /** Resolves with an error message for the form, or null once the buyer is saved. */
  const create = async (input: ContactInput): Promise<string | null> => {
    try {
      const res = await createContact(forServer(input));
      if (!res.ok) return firstError(res.fieldErrors) ?? "Couldn't add the buyer. Please try again.";
      setContacts((prev) => [res.data, ...prev]);
      setAdding(false);
      setSelectedId(res.data.id);
      toast.success(`${res.data.name} added.`);
      return null;
    } catch {
      return "Couldn't add the buyer. Check your connection and try again.";
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await deleteContact(id);
      if (!res.ok && res.error !== "not_found") {
        toast.error("Couldn't delete the buyer. Please try again.");
        return;
      }
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setSelectedId(null);
      toast.success("Buyer deleted.");
    } catch {
      toast.error("Couldn't delete the buyer. Check your connection and try again.");
    }
  };

  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const boardStages = showLost ? STAGES : ACTIVE_STAGES;
  const filtering = query.trim() !== "" || onlyDue;

  const toggleBtn = (on: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
    );

  return (
    <section className="flex h-full min-h-0 flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 px-4 pt-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Buyers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCount} active {activeCount === 1 ? "buyer" : "buyers"}. Only your agency can see this list.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <IconPlus /> Add buyer
        </button>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-4 sm:px-6">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="crm-search" className="sr-only">Search buyers</label>
          <input
            id="crm-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, phone, email or area"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <button type="button" aria-pressed={onlyDue} onClick={() => setOnlyDue((v) => !v)} className={toggleBtn(onlyDue)}>
          <span className={cn("size-1.5 rounded-full", dueCount > 0 ? "bg-destructive" : "bg-muted-foreground/40")} />
          Follow-ups due
          <span className="tabular-nums">{dueCount}</span>
        </button>

        {lostCount > 0 && (
          <button type="button" aria-pressed={showLost} onClick={() => setShowLost((v) => !v)} className={toggleBtn(showLost)}>
            Show lost <span className="tabular-nums">{lostCount}</span>
          </button>
        )}

        <div role="group" aria-label="View" className="ml-auto inline-flex rounded-md border border-border p-0.5">
          {(
            [
              ["pipeline", "Pipeline", IconBoard],
              ["list", "List", IconList],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => setView(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon width={14} height={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1">
        {contacts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your first buyer to track where they are in the process and when to follow up.
            </p>
            <button type="button" onClick={() => setAdding(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Add buyer
            </button>
          </div>
        ) : visible.length === 0 && filtering ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
            <p className="text-sm text-muted-foreground">No buyers match these filters.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setOnlyDue(false);
              }}
              className="text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : view === "pipeline" ? (
          <PipelineBoard contacts={visible} stages={boardStages} onOpen={setSelectedId} onMove={moveStage} />
        ) : (
          <div className="h-full pt-2">
            <ContactTable contacts={visible} onOpen={setSelectedId} />
          </div>
        )}
      </div>

      {selected && (
        <ContactDrawer
          contact={selected}
          onClose={closeDrawer}
          onMove={moveStage}
          onUpdate={update}
          onAddNote={addNote}
          onDelete={remove}
        />
      )}

      {adding && (
        <Modal title="Add buyer" onClose={() => setAdding(false)}>
          <ContactForm submitLabel="Add buyer" showStage onSubmit={create} onCancel={() => setAdding(false)} />
        </Modal>
      )}
    </section>
  );
}
