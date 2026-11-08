"use client";

import { useState } from "react";
import type { Contact, Stage, StageId } from "@/types/crm";
import { nextStage } from "@/types/crm";
import { cn, dayDiff, formatBudget, formatDate } from "./utils";
import { FollowUpStatus } from "./FollowUpStatus";
import { IconArrow } from "./icons";

interface Props {
  contacts: Contact[];
  stages: Stage[];
  onOpen: (id: string) => void;
  onMove: (id: string, stage: StageId) => void;
}

export function PipelineBoard({ contacts, stages, onOpen, onMove }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageId | null>(null);

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4 sm:p-6">
      {stages.map((stage) => {
        const items = contacts.filter((c) => c.stage === stage.id);
        const isOver = overStage === stage.id && dragId !== null;
        const next = nextStage(stage.id);

        return (
          <section
            key={stage.id}
            aria-label={`${stage.label}, ${items.length} buyers`}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overStage !== stage.id) setOverStage(stage.id);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverStage(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              if (id) onMove(id, stage.id);
              setOverStage(null);
              setDragId(null);
            }}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-lg bg-muted/60 transition-shadow",
              isOver && "ring-2 ring-ring",
              stage.id === "lost" && "bg-muted/30"
            )}
          >
            <header className="flex items-baseline justify-between px-3 pb-2 pt-3">
              <h2 className="text-sm font-medium">{stage.label}</h2>
              <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
            </header>

            <ul className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
              {items.map((c) => (
                <li key={c.id}>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", c.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(c.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                    className={cn(
                      "cursor-grab rounded-md border border-border bg-card text-card-foreground hover:border-primary/40 active:cursor-grabbing",
                      dragId === c.id && "opacity-40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onOpen(c.id)}
                      className="block w-full rounded-t-md p-3 pb-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium leading-snug">{c.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{c.language}</span>
                      </div>
                      <p className="mt-1 text-sm tabular-nums">{formatBudget(c.budgetMin, c.budgetMax)}</p>
                      {c.areas.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.areas.join(", ")}</p>
                      )}
                      {c.arrivalDate && dayDiff(c.arrivalDate) >= 0 && (
                        <p className="mt-2 text-xs text-primary">Arrives {formatDate(c.arrivalDate)}</p>
                      )}
                      <FollowUpStatus contact={c} className="mt-3" />
                    </button>
                    {next && (
                      <div className="border-t border-border px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => onMove(c.id, next.id)}
                          aria-label={`Move ${c.name} to ${next.label}`}
                          className="inline-flex w-full items-center justify-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Move to {next.label}
                          <IconArrow width={12} height={12} className="-rotate-90" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {items.length === 0 && (
                <li className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  Drag a buyer here
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
