"use client";

import { useEffect, useId, useState } from "react";
import type { Contact, ContactInput, StageId } from "@/types/crm";
import { ACTIVE_STAGES, nextStage } from "@/types/crm";
import { cn, formatBudget, formatDate, formatDateTime, relativeDay, whatsappLink } from "./utils";
import { ContactForm, inputClass } from "./ContactForm";
import { IconChat, IconMail, IconPhone, IconTrash, IconX } from "./icons";
import { ClientPageLink } from "../client-pages/ClientPageLink";

interface Props {
  contact: Contact;
  onClose: () => void;
  onMove: (id: string, stage: StageId) => void;
  onUpdate: (id: string, changes: Partial<Contact>) => void;
  onAddNote: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}

export function ContactDrawer({ contact: c, onClose, onMove, onUpdate, onAddNote, onDelete }: Props) {
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setEditing(false);
    setDraft("");
    setConfirmDelete(false);
  }, [c.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !editing && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, editing]);

  const saveNote = () => {
    if (!draft.trim()) return;
    onAddNote(c.id, draft.trim());
    setDraft("");
  };

  const currentIndex = ACTIVE_STAGES.findIndex((s) => s.id === c.stage);
  const next = nextStage(c.stage);
  const iconBtn =
    "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-background shadow-xl"
      >
        {/* Header */}
        <header className="border-b border-border px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold leading-tight">{c.name}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Added {formatDate(c.createdAt)} via {c.source}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconX />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {c.phone && (
              <>
                <a href={whatsappLink(c.phone)} target="_blank" rel="noreferrer" className={iconBtn}>
                  <IconChat width={14} height={14} /> WhatsApp
                </a>
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className={iconBtn}>
                  <IconPhone width={14} height={14} /> {c.phone}
                </a>
              </>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className={iconBtn}>
                <IconMail width={14} height={14} /> {c.email}
              </a>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Stage */}
          <section className="border-b border-border px-5 py-5" aria-label="Pipeline stage">
            <div className="grid grid-cols-6 gap-1">
              {ACTIVE_STAGES.map((s, i) => {
                const reached = c.stage !== "lost" && i <= currentIndex;
                const current = s.id === c.stage;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={current}
                    onClick={() => onMove(c.id, s.id)}
                    className="group flex flex-col gap-1.5 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className={cn("h-1.5 rounded-full transition-colors", reached ? "bg-primary" : "bg-muted group-hover:bg-primary/30")} />
                    <span className={cn("truncate text-xs", current ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {next && (
              <button
                type="button"
                onClick={() => onMove(c.id, next.id)}
                className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Move to {next.label}
              </button>
            )}
            <div className="mt-3 text-xs">
              {c.stage === "lost" ? (
                <p className="text-destructive">
                  Marked as lost.{" "}
                  <button type="button" onClick={() => onMove(c.id, "contacted")} className="underline underline-offset-2 hover:no-underline">
                    Reopen
                  </button>
                </p>
              ) : (
                <button type="button" onClick={() => onMove(c.id, "lost")} className="text-muted-foreground hover:text-destructive">
                  Mark as lost
                </button>
              )}
            </div>
          </section>

          {/* Client page */}
          <section className="border-b border-border px-5 py-4" aria-label="Client page">
            <ClientPageLink contact={c} />
          </section>

          {/* Next step */}
          <section className="grid gap-4 border-b border-border px-5 py-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`fu-${c.id}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                Next follow-up
              </label>
              <input
                id={`fu-${c.id}`}
                type="date"
                className={inputClass}
                value={c.nextFollowUpAt ?? ""}
                onChange={(e) => onUpdate(c.id, { nextFollowUpAt: e.target.value || undefined })}
              />
            </div>
            <div>
              <label htmlFor={`arr-${c.id}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                Arrives in Spain
              </label>
              <input
                id={`arr-${c.id}`}
                type="date"
                className={inputClass}
                value={c.arrivalDate ?? ""}
                onChange={(e) => onUpdate(c.id, { arrivalDate: e.target.value || undefined })}
              />
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Last contact</span>
              <div className="flex items-center justify-between gap-2 py-2">
                <span className="text-sm">{c.lastContactAt ? relativeDay(c.lastContactAt) : "Never"}</span>
                <button
                  type="button"
                  onClick={() => onUpdate(c.id, { lastContactAt: new Date().toISOString() })}
                  className="text-xs text-primary hover:underline"
                >
                  Log contact today
                </button>
              </div>
            </div>
          </section>

          {/* Requirements */}
          <section className="border-b border-border px-5 py-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium">What they're looking for</h3>
              {!editing && (
                <button type="button" onClick={() => setEditing(true)} className="text-xs text-primary hover:underline">
                  Edit details
                </button>
              )}
            </div>

            {editing ? (
              <div className="-mx-5 -mb-5 border-t border-border">
                <ContactForm
                  initial={c}
                  submitLabel="Save changes"
                  onCancel={() => setEditing(false)}
                  onSubmit={(v: ContactInput) => {
                    onUpdate(c.id, v);
                    setEditing(false);
                  }}
                />
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Budget</dt>
                  <dd className="tabular-nums">{formatBudget(c.budgetMin, c.budgetMax)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Bedrooms</dt>
                  <dd>{c.bedroomsMin ? `${c.bedroomsMin}+` : "Any"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Areas</dt>
                  <dd>{c.areas.join(", ") || "Any"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Property type</dt>
                  <dd>{c.propertyTypes.join(", ") || "Any"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Language</dt>
                  <dd>{c.language}</dd>
                </div>
              </dl>
            )}
          </section>

          {/* Notes */}
          <section className="px-5 py-5" aria-label="Notes">
            <h3 className="mb-3 text-sm font-medium">Notes</h3>
            <label htmlFor={`note-${c.id}`} className="sr-only">New note</label>
            <textarea
              id={`note-${c.id}`}
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  saveNote();
                }
              }}
              placeholder="What happened, what they said, what's next"
              className={cn(inputClass, "resize-y")}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ctrl + Enter to save</span>
              <button
                type="button"
                onClick={saveNote}
                disabled={!draft.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Save note
              </button>
            </div>

            {c.notes.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                No notes yet. Log calls, viewings and anything the buyer tells you here.
              </p>
            ) : (
              <ol className="mt-6 space-y-4 border-l border-border pl-4">
                {c.notes.map((n) => (
                  <li key={n.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[21px] top-1.5 size-2 rounded-full ring-4 ring-background",
                        n.kind === "stage" ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                    <time className="text-xs text-muted-foreground" dateTime={n.createdAt}>
                      {formatDateTime(n.createdAt)}
                    </time>
                    <p className={cn("mt-0.5 whitespace-pre-line text-sm", n.kind === "stage" && "text-muted-foreground")}>
                      {n.body}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-border px-5 py-3">
          {confirmDelete ? (
            <div className="flex w-full items-center justify-between gap-3">
              <span className="text-sm">Delete {c.name} and all notes?</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white hover:bg-destructive/90"
                >
                  Delete buyer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <IconTrash width={14} height={14} /> Delete buyer
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
