const base =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const btnPrimary = `${base} bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary`;
export const btnSecondary = `${base} border border-border bg-white text-foreground hover:bg-muted focus-visible:ring-primary`;
export const btnDanger = `${base} bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive`;
export const btnDangerGhost = `${base} border border-destructive/30 bg-white text-destructive hover:bg-destructive/10 focus-visible:ring-destructive`;
export const btnLink =
  "rounded px-1 text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60";
