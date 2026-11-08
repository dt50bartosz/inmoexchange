"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import type { Contact } from "@/types/crm";
import { inputClass } from "../crm/ContactForm";
import { cn } from "../crm/utils";
import { IconChat } from "../crm/icons";
import type { ClientPage, PageStatus, Property, ShortlistItem } from "@/types/client-pages";
import { saveClientPage } from "@/app/[locale]/panel/client-pages/[id]/server/actions";
import { PropertySearch } from "./PropertySearch";
import { ShortlistPanel } from "./ShortlistPanel";
import { CopyLinkButton } from "./CopyLinkButton";
import { StatusPill } from "./StatusPill";
import { effectiveStatus, firstName, pageUrl, whatsappShareLink } from "./utils";

type Props = {
  /** null when the page doesn't exist or belongs to another agency. */
  page: ClientPage | null;
  /** The CRM buyer (null if deleted from the CRM). */
  buyer: Contact | null;
  /** Shortlisted properties that are still available (sold / unshared ones drop out). */
  properties: Property[];
  /** Properties with client activity the agent hadn't seen when the page opened. */
  newIds: string[];
};

export default function ClientPageEditor({ page, buyer, properties, newIds }: Props) {
  if (!page) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
        <p className="text-sm text-muted-foreground">This client page doesn&rsquo;t exist or was deleted.</p>
        <Link href="/panel/client-pages" className="text-sm text-primary hover:underline">
          Back to client pages
        </Link>
      </div>
    );
  }
  return <Editor key={page.id} initialPage={page} buyer={buyer} initialProperties={properties} newIds={newIds} />;
}

/** Only the fields the agent edits; used to detect unsaved changes. */
const agentShape = (items: ShortlistItem[]) => items.map((i) => [i.propertyId, i.agentComment]);

function Editor({
  initialPage,
  buyer,
  initialProperties,
  newIds: newIdList,
}: {
  initialPage: ClientPage;
  buyer: Contact | null;
  initialProperties: Property[];
  newIds: string[];
}) {
  // The last saved version (what the client sees); the draft below is compared against it
  const [page, setPage] = useState(initialPage);
  const first = firstName(page.buyerName);
  // Every property the editor knows about (shortlist + search results), to show the shortlist
  const [known, setKnown] = useState<Record<string, Property>>(() => Object.fromEntries(initialProperties.map((p) => [p.id, p])));
  const remember = (list: Property[]) => setKnown((prev) => ({ ...prev, ...Object.fromEntries(list.map((p) => [p.id, p])) }));
  const [saving, setSaving] = useState(false);

  // Draft state: nothing reaches the client's page until "Save and update page".
  // Sold / unshared properties have dropped out of `known` and are left off.
  const [items, setItems] = useState<ShortlistItem[]>(() => page.items.filter((i) => i.propertyId in known));
  const [welcome, setWelcome] = useState(page.welcomeMessage);
  const [expiresAt, setExpiresAt] = useState(page.expiresAt ?? "");
  const [status, setStatus] = useState<PageStatus>(page.status);
  const [justSaved, setJustSaved] = useState(false);
  const [tab, setTab] = useState<"search" | "shortlist">(page.items.length ? "shortlist" : "search");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Reactions that were new when the editor opened (the server has marked them as seen)
  const newIds = useMemo(() => new Set(newIdList), [newIdList]);

  const dirty =
    JSON.stringify(agentShape(items)) !== JSON.stringify(agentShape(page.items.filter((i) => i.propertyId in known))) ||
    welcome !== page.welcomeMessage ||
    (expiresAt || undefined) !== page.expiresAt ||
    status !== page.status;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const selectedIds = useMemo(() => new Set(items.map((i) => i.propertyId)), [items]);

  // ---- Draft actions ----
  function toggle(propertyId: string) {
    setItems((prev) =>
      prev.some((i) => i.propertyId === propertyId)
        ? prev.filter((i) => i.propertyId !== propertyId)
        : [...prev, { propertyId, agentComment: "", addedAt: new Date().toISOString(), seenByAgent: true }]
    );
  }
  function move(from: number, to: number) {
    setItems((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }
  function comment(propertyId: string, value: string) {
    setItems((prev) => prev.map((i) => (i.propertyId === propertyId ? { ...i, agentComment: value } : i)));
  }
  function discard() {
    setItems(page.items.filter((i) => i.propertyId in known));
    setWelcome(page.welcomeMessage);
    setExpiresAt(page.expiresAt ?? "");
    setStatus(page.status);
  }
  async function save() {
    // The server keeps the client's reactions; only the agent's part is sent
    setSaving(true);
    const res = await saveClientPage(page.id, {
      items: items.map((i) => ({ propertyId: i.propertyId, agentComment: i.agentComment })),
      welcomeMessage: welcome.trim(),
      expiresAt,
      status,
    }).catch(() => undefined);
    setSaving(false);
    if (!res?.ok) {
      toast.error("Couldn't save the page. Try again.");
      return;
    }
    setPage(res.data);
    setItems(res.data.items.filter((i) => i.propertyId in known));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  const url = pageUrl(page);
  const shownStatus = effectiveStatus({ ...page, status, expiresAt: expiresAt || undefined });

  return (
    <section className="flex h-full min-h-0 flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="border-b border-border px-4 pb-4 pt-5 sm:px-6">
        <Link href="/panel/client-pages" className="text-xs text-muted-foreground hover:text-foreground">
          &larr; Client pages
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{page.buyerName}</h1>
              <StatusPill status={shownStatus} />
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              <a href={url} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
                {url}
              </a>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyLinkButton url={url} />
            <a
              href={whatsappShareLink(page)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconChat width={14} height={14} /> Send on WhatsApp
            </a>
            {buyer && (
              <Link href="/panel/crm" className="px-1 text-xs text-muted-foreground hover:text-foreground">
                Open in CRM
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile tabs */}
      <div role="tablist" className="flex border-b border-border lg:hidden">
        {(
          [
            ["search", "Find properties"],
            ["shortlist", `${first}'s page (${items.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 border-b-2 px-3 py-2.5 text-sm",
              tab === id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Two panes */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={cn("min-h-0 border-border lg:border-r", tab === "search" ? "block" : "hidden lg:block")}>
          <PropertySearch buyer={buyer ?? undefined} selectedIds={selectedIds} onToggle={toggle} onResults={remember} />
        </div>

        <div className={cn("min-h-0 flex-col", tab === "shortlist" ? "flex" : "hidden lg:flex")}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">
              What {first} sees <span className="font-normal text-muted-foreground">({items.length})</span>
            </h2>
            <button
              type="button"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((v) => !v)}
              className="text-xs text-primary hover:underline"
            >
              {settingsOpen ? "Hide page settings" : "Page settings"}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {settingsOpen && (
              <div className="space-y-4 border-b border-border bg-muted/30 p-4">
                <div>
                  <label htmlFor="cp-welcome" className="mb-1 block text-xs font-medium text-muted-foreground">
                    Welcome message at the top of the page
                  </label>
                  <textarea id="cp-welcome" rows={3} className={cn(inputClass, "resize-y")} value={welcome} onChange={(e) => setWelcome(e.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="cp-expires" className="mb-1 block text-xs font-medium text-muted-foreground">
                      Link stops working after
                    </label>
                    <input id="cp-expires" type="date" className={inputClass} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                    <p className="mt-1 text-xs text-muted-foreground">Leave empty to keep it open.</p>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">Page visibility</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={status === "live"}
                      onClick={() => setStatus((s) => (s === "live" ? "paused" : "live"))}
                      className="flex items-center gap-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className={cn("relative h-5 w-9 rounded-full transition-colors", status === "live" ? "bg-primary" : "bg-muted-foreground/30")}>
                        <span className={cn("absolute top-0.5 size-4 rounded-full bg-background shadow transition-all", status === "live" ? "left-[18px]" : "left-0.5")} />
                      </span>
                      {status === "live" ? `${first} can open the page` : "Paused, the link doesn’t open"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ShortlistPanel
              items={items}
              buyerFirstName={first}
              newIds={newIds}
              properties={known}
              onMove={move}
              onRemove={toggle}
              onComment={comment}
            />
          </div>
        </div>
      </div>

      {/* Save bar */}
      <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {justSaved
            ? `Page updated. ${first} sees the new version now.`
            : dirty
              ? `Unsaved changes. ${first} still sees the previous version.`
              : `${first}'s page is up to date.`}
        </p>
        <div className="flex shrink-0 gap-2">
          {dirty && (
            <button type="button" onClick={discard} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {saving ? "Saving…" : "Save and update page"}
          </button>
        </div>
      </footer>
    </section>
  );
}
