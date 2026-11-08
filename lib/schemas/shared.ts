/**
 * Zod error messages are translation keys under panel.validation.
 * FormField translates them, so schemas stay language-free and work on the server too.
 */
export const V = {
  required: "required",
  email: "email",
  url: "url",
  phone: "phone",
  year: "year",
  postcode: "postcode",
  tooLong: "tooLong",
  pickOne: "pickOne",
  number: "number",
  positive: "positive",
  defaultLanguageText: "defaultLanguageText",
  oneDescription: "oneDescription",
  passwordMin: "passwordMin",
  passwordSame: "passwordSame",
  passwordMatch: "passwordMatch",
  wrongPassword: "wrongPassword",
  emailTaken: "emailTaken",
  sameEmail: "sameEmail",
  taxId: "taxId",
  cardNumber: "cardNumber",
  expiry: "expiry",
  expired: "expired",
  cvc: "cvc",
  priceRange: "priceRange",
  iban: "iban",
  whatsapp: "whatsapp",
  idNumber: "idNumber",
  acceptPrivacy: "acceptPrivacy",
  acceptTerms: "acceptTerms",
  /** Number above the field's maximum. */
  tooBig: "tooBig",
  /** Fallback when a message isn't a known key (see components/panel/useValidationMessage.ts). */
  invalid: "invalid",
  slug: "slug",
  slugTaken: "slugTaken",
} as const;

export type ValidationKey = (typeof V)[keyof typeof V];

export const RE = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/[^\s.]+\.[^\s]+$/i,
  phone: /^\+?[0-9\s()-]{7,20}$/,
  /** International format for wa.me: + country code and number, 8–15 digits in all ("+34600000000"). */
  whatsapp: /^\+[1-9]\d{7,14}$/,
  year: /^(19|20)\d{2}$/,
  postcodeEs: /^\d{5}$/,
};

/** Accept empty string, or a value matching the pattern. */
export const optionalMatch = (re: RegExp) => (v: string) => v.trim() === "" || re.test(v.trim());

/**
 * A WhatsApp number in international format, as typed in the agency details: spaces, dots, dashes and brackets
 * are removed, "00" becomes "+", and a Spanish number typed without the country code ("600 111 222") gets +34.
 * Anything else is returned as typed (without separators), so validation can reject it.
 */
export function normalizeWhatsapp(raw: string) {
  const v = raw.trim().replace(/[\s().-]/g, "");
  if (!v) return "";
  if (v.startsWith("00")) return `+${v.slice(2)}`;
  if (/^[6789]\d{8}$/.test(v)) return `+34${v}`;
  return v;
}

/** IBAN without spaces, upper case ("ES91 2100 0418 4502 0005 1332" → "ES9121000418450200051332"). */
export const normalizeIban = (v: string) => v.replace(/\s+/g, "").toUpperCase();

/** A valid IBAN: country code, check digits and length, and the ISO 13616 mod-97 checksum. */
export function isValidIban(raw: string) {
  const iban = normalizeIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith("ES") && iban.length !== 24) return false;
  const digits = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  return rest === 1;
}
