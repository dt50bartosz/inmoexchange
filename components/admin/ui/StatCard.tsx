import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

type Props = { label: string; value: number; href: string; tone?: "default" | "warning" | "danger"; hint?: ReactNode };

export default function StatCard({ label, value, href, tone = "default", hint }: Props) {
  const toneClass = tone === "danger" && value > 0 ? "text-destructive" : tone === "warning" && value > 0 ? "text-warning" : "";
  return (
    <Link
      href={href}
      className="block rounded-xl border bg-card p-4 outline-none transition-colors hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Link>
  );
}
