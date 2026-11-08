import { Badge } from "@/components/ui/Badge";
import type { AgencyStatus } from "@/lib/constants/admin";

const STYLE: Record<AgencyStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success-soft text-success" },
  trial: { label: "Trial", className: "bg-warning-soft text-warning" },
  suspended: { label: "Suspended", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

export default function AgencyStatusBadge({ status }: { status: AgencyStatus }) {
  return (
    <Badge variant="secondary" className={STYLE[status].className}>
      {STYLE[status].label}
    </Badge>
  );
}
