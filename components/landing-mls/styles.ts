/** Colabora MLS landing: shared class strings (tokens in app/globals.css → navy, offwhite, cta (brand blue)). */

const ctaBase =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

/** The one accent: primary actions only. */
export const ctaPrimary = `${ctaBase} bg-cta text-white hover:bg-cta-hover focus-visible:outline-cta`;

/** Secondary action on navy. */
export const ctaOutlineOnDark = `${ctaBase} border border-white/40 text-white hover:border-white hover:bg-white/10 focus-visible:outline-white`;

/** Small label above section titles. */
export const eyebrow = "text-xs font-semibold uppercase tracking-[0.2em] text-cta-ink";

export const sectionTitle = "mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-4xl";

/** Section padding and width, mobile first. */
export const sectionPad = "px-5 py-16 sm:px-8 sm:py-24";
export const inner = "mx-auto max-w-6xl";
