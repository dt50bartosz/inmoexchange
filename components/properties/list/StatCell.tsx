import { TableCell } from "@/components/ui/table";

type Props = {
  /** Last 30 days: shown large. */
  recent: number;
  /** Already worded, e.g. "140 total" / "140 en total". */
  totalText: string;
  /** Read after the number by screen readers, e.g. "in the last 30 days". */
  recentLabel: string;
};

/** A views / WhatsApp cell: last 30 days large, all time small under it (panel and admin property lists). */
export default function StatCell({ recent, totalText, recentLabel }: Props) {
  return (
    <TableCell className="whitespace-nowrap text-right tabular-nums">
      <span className={`font-medium ${recent === 0 ? "text-muted-foreground" : ""}`}>
        {recent}
        <span className="sr-only"> {recentLabel}</span>
      </span>
      <span className="block text-xs text-muted-foreground">{totalText}</span>
    </TableCell>
  );
}
