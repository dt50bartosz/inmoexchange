import type { ReactNode } from "react";

/** White card that holds a stack of PanelSections. `danger` gives it a red border. */
export default function PanelCard({ children, danger, className = "" }: { children: ReactNode; danger?: boolean; className?: string }) {
  return (
    <div
      className={`rounded-xl border bg-card text-card-foreground ${danger ? "border-destructive/40" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
