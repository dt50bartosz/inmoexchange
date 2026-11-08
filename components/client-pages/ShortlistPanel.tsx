"use client";

import { useState } from "react";
import { cn, formatDate } from "../crm/utils";
import { IconArrow, IconX } from "../crm/icons";
import type { Property, ShortlistItem } from "@/types/client-pages";
import { PropertyThumb } from "./PropertyThumb";
import { formatPrice } from "./utils";

interface Props {
  items: ShortlistItem[];
  buyerFirstName: string;
  /** Items whose client activity was new when the editor opened. */
  newIds: Set<string>;
  /** Property details by id (shortlist + search results). */
  properties: Record<string, Property>;
  onMove: (from: number, to: number) => void;
  onRemove: (propertyId: string) => void;
  onComment: (propertyId: string, comment: string) => void;
}

export function ShortlistPanel({ items, buyerFirstName, newIds, properties, onMove, onRemove, onComment }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="max-w-xs text-sm text-muted-foreground">
          Nothing on {buyerFirstName}&rsquo;s page yet. Add properties from the search and they&rsquo;ll appear here in the
          order {buyerFirstName} will see them.
        </p>
      </div>
    );
  }

  const iconBtn =
    "rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <ol className="space-y-3 p-4">
      {items.map((item, index) => {
        const p = properties[item.propertyId];
        if (!p) return null;
        const isNew = newIds.has(item.propertyId);
        return (
          <li
            key={item.propertyId}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              setDragIndex(index);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== index) onMove(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              "rounded-md border bg-card p-3",
              isNew ? "border-destructive/50" : "border-border",
              item.reaction === "rejected" && "opacity-70",
              dragIndex === index && "opacity-40"
            )}
          >
            <div className="flex gap-3">
              <span className="w-5 shrink-0 pt-0.5 text-center text-sm tabular-nums text-muted-foreground">{index + 1}</span>
              <PropertyThumb property={p} className="size-14 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.town}, {formatPrice(p.price)}
                </p>
              </div>
              <div className="flex shrink-0 items-start">
                <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index, index - 1)} className={iconBtn}>
                  <IconArrow width={14} height={14} className="rotate-180" />
                </button>
                <button type="button" aria-label="Move down" disabled={index === items.length - 1} onClick={() => onMove(index, index + 1)} className={iconBtn}>
                  <IconArrow width={14} height={14} />
                </button>
                <button type="button" aria-label={`Remove ${p.title}`} onClick={() => onRemove(p.id)} className={cn(iconBtn, "hover:text-destructive")}>
                  <IconX width={14} height={14} />
                </button>
              </div>
            </div>

            {/* What the client did */}
            {(item.reaction || item.clientComment || item.viewingRequestedAt) && (
              <div className="ml-8 mt-3 space-y-1.5 rounded-md bg-muted/60 p-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {isNew && <span className="font-medium text-destructive">New</span>}
                  {item.reaction === "liked" && <span className="font-medium text-primary">{buyerFirstName} liked this</span>}
                  {item.reaction === "rejected" && <span className="text-muted-foreground">{buyerFirstName} isn&rsquo;t interested</span>}
                  {item.viewingRequestedAt && (
                    <span className="rounded bg-primary px-1.5 py-0.5 font-medium text-primary-foreground">
                      Viewing requested {formatDate(item.viewingRequestedAt)}
                    </span>
                  )}
                </div>
                {item.clientComment && <p className="text-foreground">&ldquo;{item.clientComment}&rdquo;</p>}
              </div>
            )}

            <div className="ml-8 mt-3">
              <label htmlFor={`ac-${item.propertyId}`} className="sr-only">
                Your note to {buyerFirstName}
              </label>
              <textarea
                id={`ac-${item.propertyId}`}
                rows={2}
                value={item.agentComment}
                onChange={(e) => onComment(item.propertyId, e.target.value)}
                placeholder={`Why this one suits ${buyerFirstName} (optional, shown on the page)`}
                className="w-full resize-y rounded-md border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
