"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAgency } from "@/components/panel/AgencyProvider";
import type { Contact } from "@/types/crm";
import type { ClientPage } from "@/types/client-pages";
import { cn, relativeDay } from "../crm/utils";
import { IconPlus } from "../crm/icons";
import { NewClientPageModal } from "./NewClientPageModal";
import { CopyLinkButton } from "./CopyLinkButton";
import { StatusPill } from "./StatusPill";
import { effectiveStatus, newActivityCount, pageUrl } from "./utils";

/** `pages` and `contacts` (the agency's CRM buyers) are loaded on the server. */
export default function ClientPagesList({ pages, contacts }: { pages: ClientPage[]; contacts: Contact[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const agency = useAgency();
  const [creating, setCreating] = useState(false);
  const [presetBuyer, setPresetBuyer] = useState<string | undefined>();

  // Arriving from the CRM drawer: /panel/client-pages?buyer=<contactId>
  const buyerParam = params.get("buyer");
  useEffect(() => {
    if (!buyerParam) return;
    const existing = pages.find((p) => p.contactId === buyerParam);
    if (existing) {
      router.replace(`/panel/client-pages/${existing.id}`);
    } else {
      setPresetBuyer(buyerParam);
      setCreating(true);
    }
    // Only react to the URL, not to later page changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerParam]);

  // Pages with new client activity first, then most recently updated.
  const rows = useMemo(
    () =>
      [...pages].sort((a, b) => {
        const diff = newActivityCount(b) - newActivityCount(a);
        return diff !== 0 ? diff : b.updatedAt.localeCompare(a.updatedAt);
      }),
    [pages]
  );

  const closeModal = () => {
    setCreating(false);
    setPresetBuyer(undefined);
    if (buyerParam) router.replace("/panel/client-pages");
  };

  return (
    <section className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-4 pb-5 pt-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Client pages</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Personal shortlists you share with buyers. Each page shows only the properties you pick, under the{" "}
            {agency.name} name. Only your contact details are on them, never the partner agency&rsquo;s.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <IconPlus /> New client page
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              Create a page for a buyer, pick the properties that suit them, and send them the link.
            </p>
            <button type="button" onClick={() => setCreating(true)} className="text-sm text-primary hover:underline">
              Create your first client page
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {rows.map((p) => {
              const fresh = newActivityCount(p);
              const liked = p.items.filter((i) => i.reaction === "liked").length;
              const viewings = p.items.filter((i) => i.viewingRequestedAt).length;
              return (
                <li key={p.id}>
                  <div
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push(`/panel/client-pages/${p.id}`)}
                    onKeyDown={(e) => e.key === "Enter" && router.push(`/panel/client-pages/${p.id}`)}
                    className="grid cursor-pointer gap-3 px-4 py-4 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{p.buyerName}</span>
                        <StatusPill status={effectiveStatus(p)} />
                        {fresh > 0 && (
                          <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-white">
                            {fresh} new {fresh === 1 ? "reaction" : "reactions"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{pageUrl(p)}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {p.items.length} {p.items.length === 1 ? "property" : "properties"}
                        {liked > 0 && `, ${liked} liked`}
                        {viewings > 0 && `, ${viewings} viewing ${viewings === 1 ? "request" : "requests"}`}
                        {". "}
                        {p.lastViewedAt ? `Opened ${relativeDay(p.lastViewedAt)}.` : "Not opened yet."}
                      </p>
                    </div>
                    <div className={cn("flex gap-2", "sm:justify-end")}>
                      <CopyLinkButton url={pageUrl(p)} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {creating && <NewClientPageModal onClose={closeModal} initialContactId={presetBuyer} contacts={contacts} pages={pages} />}
    </section>
  );
}
