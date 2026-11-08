"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "../crm/Modal";
import { inputClass } from "../crm/ContactForm";
import { STAGE_LABEL, type Contact } from "@/types/crm";
import type { ClientPage } from "@/types/client-pages";
import { cn, formatBudget } from "../crm/utils";
import { createClientPage } from "@/app/[locale]/panel/client-pages/server/actions";

interface Props {
  onClose: () => void;
  /** Pre-selects a buyer, e.g. when arriving from the CRM drawer. */
  initialContactId?: string;
  /** The agency's CRM buyers and existing pages (loaded on the server). */
  contacts: Contact[];
  pages: ClientPage[];
}

export function NewClientPageModal({ onClose, initialContactId, contacts, pages }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialContactId ?? null);

  const buyers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => c.stage !== "lost" && (!q || c.name.toLowerCase().includes(q)));
  }, [query, contacts]);

  const pageFor = (contactId: string) => pages.find((p) => p.contactId === contactId);
  const selected = contacts.find((c) => c.id === selectedId) ?? null;

  async function create() {
    if (!selected) return;
    setCreating(true);
    const res = await createClientPage(selected.id).catch(() => undefined);
    if (!res?.ok) {
      setCreating(false);
      toast.error("Couldn't create the page. Try again.");
      return;
    }
    router.push(`/panel/client-pages/${res.data.id}`);
  }

  return (
    <Modal title="New client page" onClose={onClose}>
      <div className="p-5">
        <label htmlFor="cp-buyer-search" className="mb-1 block text-xs font-medium text-muted-foreground">
          Which buyer is this page for?
        </label>
        <input
          id="cp-buyer-search"
          type="search"
          className={inputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your buyers"
          autoFocus={!initialContactId}
        />

        <ul className="mt-3 max-h-80 divide-y divide-border overflow-y-auto rounded-md border border-border">
          {buyers.map((c) => {
            const existing = pageFor(c.id);
            const isSelected = selectedId === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => (existing ? router.push(`/panel/client-pages/${existing.id}`) : setSelectedId(c.id))}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                    isSelected && "bg-primary/10"
                  )}
                >
                  <span>
                    <span className="block text-sm font-medium">{c.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {STAGE_LABEL[c.stage]}, {formatBudget(c.budgetMin, c.budgetMax)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {existing ? "Has a page, open it" : isSelected ? "Selected" : ""}
                  </span>
                </button>
              </li>
            );
          })}
          {buyers.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              No buyers match. Add them in the CRM first.
            </li>
          )}
        </ul>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          {selected ? `The page starts empty. You pick every property.` : "Pick a buyer to continue."}
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            Cancel
          </button>
          <button
            type="button"
            onClick={create}
            disabled={creating || !selected || Boolean(selected && pageFor(selected.id))}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {creating ? "Creating…" : "Create page"}
          </button>
        </div>
      </footer>
    </Modal>
  );
}
