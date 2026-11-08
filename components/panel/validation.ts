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
  sameEmail: "sameEmail",
  taxId: "taxId",
  cardNumber: "cardNumber",
  expiry: "expiry",
  expired: "expired",
  cvc: "cvc",
} as const;

export type ValidationKey = (typeof V)[keyof typeof V];

/** Field name → translation key of its error. Missing key = field is valid. */
export type Errors = Partial<Record<string, ValidationKey>>;

export const RE = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/[^\s.]+\.[^\s]+$/i,
  phone: /^\+?[0-9\s()-]{7,20}$/,
  year: /^(19|20)\d{2}$/,
  postcodeEs: /^\d{5}$/,
};

/** Accept empty string, or a value matching the pattern. */
export const optionalMatch = (re: RegExp) => (v: string) => v.trim() === "" || re.test(v.trim());