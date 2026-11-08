"use client";

import { useMemo, useState } from "react";
import type { Contact } from "@/types/crm";
import { STAGE_LABEL } from "@/types/crm";
import { cn, formatBudget, formatDate, relativeDay, toDate } from "./utils";
import { FollowUpStatus } from "./FollowUpStatus";
import { IconArrow } from "./icons";

type SortKey = "name" | "stage" | "budget" | "lastContact" | "followUp" | "arrival";

const STAGE_ORDER = ["new", "contacted", "qualified", "viewing", "offer", "closed", "lost"];

function sortValue(c: Contact, key: SortKey): string | number {
  switch (key) {
    case "name":
      return c.name.toLowerCase();
    case "stage":
      return STAGE_ORDER.indexOf(c.stage);
    case "budget":
      return c.budgetMax ?? c.budgetMin ?? -1;
    case "lastContact":
      return c.lastContactAt ? toDate(c.lastContactAt).getTime() : -Infinity;
    case "followUp":
      return c.nextFollowUpAt ? toDate(c.nextFollowUpAt).getTime() : Infinity;
    case "arrival":
      return c.arrivalDate ? toDate(c.arrivalDate).getTime() : Infinity;
  }
}

interface Props {
  contacts: Contact[];
  onOpen: (id: string) => void;
}

export function ContactTable({ contacts, onOpen }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "followUp", dir: 1 });

  const rows = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [contacts, sort]);

  const Th = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => {
    const active = sort.key === k;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
        className={cn("border-b border-border px-3 py-2 text-left font-medium", className)}
      >
        <button
          type="button"
          onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((s.dir * -1) as 1 | -1) : 1 }))}
          className={cn(
            "inline-flex items-center gap-1 rounded text-xs hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            active ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {children}
          <IconArrow
            width={12}
            height={12}
            className={cn("transition-transform", !active && "opacity-0", sort.dir === -1 && "rotate-180")}
          />
        </button>
      </th>
    );
  };

  return (
    <div className="h-full overflow-auto px-4 pb-6 sm:px-6">
      <table className="w-full min-w-[940px] border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          <tr>
            <Th k="name">Buyer</Th>
            <Th k="stage">Stage</Th>
            <Th k="budget">Budget</Th>
            <th scope="col" className="border-b border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              Areas
            </th>
            <Th k="lastContact">Last contact</Th>
            <Th k="arrival">Arrives</Th>
            <Th k="followUp">Next step</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              key={c.id}
              tabIndex={0}
              onClick={() => onOpen(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(c.id);
                }
              }}
              className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
            >
              <td className="border-b border-border px-3 py-3">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.language}, via {c.source}
                </div>
              </td>
              <td className="border-b border-border px-3 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs",
                    c.stage === "lost"
                      ? "bg-destructive/10 text-destructive"
                      : c.stage === "closed"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {STAGE_LABEL[c.stage]}
                </span>
              </td>
              <td className="border-b border-border px-3 py-3 tabular-nums">{formatBudget(c.budgetMin, c.budgetMax)}</td>
              <td className="max-w-48 truncate border-b border-border px-3 py-3 text-muted-foreground">
                {c.areas.join(", ") || "Any"}
              </td>
              <td className="border-b border-border px-3 py-3 text-muted-foreground">
                {c.lastContactAt ? relativeDay(c.lastContactAt) : "Never"}
              </td>
              <td className="border-b border-border px-3 py-3 text-muted-foreground">
                {c.arrivalDate ? formatDate(c.arrivalDate) : "—"}
              </td>
              <td className="border-b border-border px-3 py-3">
                <FollowUpStatus contact={c} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
