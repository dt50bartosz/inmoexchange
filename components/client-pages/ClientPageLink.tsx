"use client";

import { Link } from "@/i18n/navigation";
import type { Contact } from "@/types/crm";
import { useClientPagesOptional } from "./ClientPagesProvider";
import { newActivityCount } from "./utils";

/** Small section for the CRM buyer drawer linking to the buyer's client page. */
export function ClientPageLink({ contact }: { contact: Contact }) {
  const store = useClientPagesOptional();
  const page = store?.pages.find((p) => p.contactId === contact.id);

  if (!page) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">No client page yet.</p>
        <Link href={`/panel/client-pages?buyer=${contact.id}`} className="shrink-0 text-xs text-primary hover:underline">
          Create client page
        </Link>
      </div>
    );
  }

  const fresh = newActivityCount(page);
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm">
        {page.items.length} {page.items.length === 1 ? "property" : "properties"} on the page
        {fresh > 0 && <span className="font-medium text-destructive">, {fresh} new {fresh === 1 ? "reaction" : "reactions"}</span>}
      </p>
      <Link href={`/panel/client-pages/${page.id}`} className="shrink-0 text-xs text-primary hover:underline">
        View client page
      </Link>
    </div>
  );
}
