import { cn } from "../crm/utils";
import type { EffectiveStatus } from "./utils";

const LABEL: Record<EffectiveStatus, string> = { live: "Live", paused: "Paused", expired: "Expired" };

export function StatusPill({ status }: { status: EffectiveStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
        status === "live" && "bg-primary/10 text-primary",
        status === "paused" && "bg-muted text-muted-foreground",
        status === "expired" && "bg-destructive/10 text-destructive"
      )}
    >
      <span className={cn("size-1.5 rounded-full", status === "live" ? "bg-primary" : status === "paused" ? "bg-muted-foreground/60" : "bg-destructive")} />
      {LABEL[status]}
    </span>
  );
}
