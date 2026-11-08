/**
 * Company details shown on /aviso-legal, /privacidad and /terminos (one place for all three pages).
 *
 * ⚠ EXAMPLE DATA: not the real company. Replace every value below with the real details, then set
 * LEGAL_IS_EXAMPLE to false. While it is true, the three pages show a "details to be completed" banner
 * and ask search engines not to index them.
 */
export const LEGAL_IS_EXAMPLE = true;

export const LEGAL = {
  /** Razón social (or the autónomo's full name). */
  company: "Colabora MLS Ejemplo, S.L.",
  cif: "B00000000",
  address: "Calle Ejemplo 1, 03001 Alicante (España)",
  /** Registro Mercantil entry (SL / SA); "" for an autónomo. */
  registry: "Registro Mercantil de Alicante, tomo 0000, folio 00, hoja A-000000",
  /** For privacy requests and legal notices. example.com is reserved for examples: it never reaches anyone. */
  email: "privacidad@example.com",
  /** Courts for disputes (usually the registered office's city). */
  courts: "Alicante",
  /** Providers that handle personal data on our behalf. */
  hosting: "Vercel Inc.",
  emailProvider: "proveedor de correo electrónico (SMTP)",
  /** Last change to any of the three texts (YYYY-MM-DD). */
  updated: "2026-11-05",
} as const;
