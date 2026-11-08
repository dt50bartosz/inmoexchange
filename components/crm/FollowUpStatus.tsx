import type { Contact } from "@/types/crm";
import { cn, dayDiff, followUpState, relativeDay } from "./utils";

/** One line that tells the agent what to do next with this buyer. */
export function FollowUpStatus({ contact, className }: { contact: Contact; className?: string }) {
  const state = followUpState(contact);

  if (state === "overdue") {
    const days = -dayDiff(contact.nextFollowUpAt!);
    return (
      <p className={cn("flex items-center gap-1.5 text-xs font-medium text-destructive", className)}>
        <span className="size-1.5 rounded-full bg-destructive" />
        Follow-up overdue by {days} {days === 1 ? "day" : "days"}
      </p>
    );
  }
  if (state === "today") {
    return (
      <p className={cn("flex items-center gap-1.5 text-xs font-medium text-primary", className)}>
        <span className="size-1.5 rounded-full bg-primary" />
        Follow up today
      </p>
    );
  }
  if (state === "upcoming") {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Follow up {relativeDay(contact.nextFollowUpAt!)}
      </p>
    );
  }
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {contact.lastContactAt ? `Last contact ${relativeDay(contact.lastContactAt)}` : "Not contacted yet"}
    </p>
  );
}
