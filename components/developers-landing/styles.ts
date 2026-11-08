/** "Para promotoras" page: shared class strings (tokens in app/globals.css → dev-*, font-display). */

const ctaBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/** The accent: primary actions only. */
export const ctaPrimary = `${ctaBase} bg-dev-accent text-white hover:bg-dev-accent-hover focus-visible:outline-dev-accent`;

/** Secondary action on a light background. */
export const ctaOutline = `${ctaBase} border border-dev-border bg-white text-dev-ink hover:border-dev-ink/40 focus-visible:outline-dev-accent`;

/** Primary action on the dark band. */
export const ctaOnDark = `${ctaBase} bg-white text-dev-ink hover:bg-dev-light focus-visible:outline-white`;

/** Small label above titles. */
export const eyebrow = "text-xs font-semibold uppercase tracking-[0.18em] text-dev-accent";

export const sectionTitle = "font-display text-3xl font-semibold tracking-tight text-dev-ink sm:text-4xl";

/** ~96px vertical padding from tablet up, max 1200px content. */
export const sectionPad = "px-5 py-16 sm:px-8 sm:py-24";
export const inner = "mx-auto max-w-[1200px]";
