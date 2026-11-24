import { MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { LeadPhoneType, LeadStatus } from "@/lib/schemas/developer-leads";
import type { LeadPhone } from "@/types/developer-leads";

/* Shared bits of Admin → Developer calls (labels, status badge, click-to-call number). Admin is English-only. */

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  no_answer: "No answer",
  callback: "Call back",
  interested: "Interested",
  not_interested: "Not interested",
  joined: "Joined",
  do_not_call: "Do not call",
};

const STATUS_CLASS: Record<LeadStatus, string> = {
  new: "bg-muted text-foreground",
  no_answer: "bg-muted text-muted-foreground",
  callback: "bg-warning-soft text-warning",
  interested: "bg-success-soft text-success",
  not_interested: "bg-muted text-muted-foreground line-through",
  joined: "bg-success-soft text-success",
  do_not_call: "bg-destructive/10 text-destructive",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="secondary" className={STATUS_CLASS[status]}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}

export const PHONE_TYPE_LABELS: Record<LeadPhoneType, string> = { mobile: "Mobile", office: "Office", whatsapp: "WhatsApp", other: "Other" };

/**
 * A number as a tel: link, exactly as stored (only spaces and dashes are left out of the link itself).
 * WhatsApp-only numbers say "message first": they shouldn't be cold-called.
 */
export function PhoneLink({ phone, showType = true }: { phone: LeadPhone; showType?: boolean }) {
  const whatsapp = phone.type === "whatsapp";
  const Icon = whatsapp ? MessageCircle : Phone;
  return (
    <span className="inline-flex min-w-0 flex-col">
      <a href={`tel:${phone.number.replace(/[\s\-().]/g, "")}`} className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap hover:underline">
        <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        {phone.number}
      </a>
      {showType && (
        <span className="text-xs text-muted-foreground">
          {PHONE_TYPE_LABELS[phone.type]}
          {phone.label ? ` · ${phone.label}` : ""}
          {whatsapp && " · message first"}
        </span>
      )}
    </span>
  );
}
