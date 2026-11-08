import { z } from "zod";
import { REGION_KEYS } from "@/lib/constants/options";
import { NEW_AGENCY_STATUSES } from "@/lib/constants/admin";
import { ACCOUNT_TYPES } from "@/lib/constants/developers";
import { RE, V, isValidIban, optionalMatch } from "./shared";

/** Admin → Agencies → Add agency. Also used when approving an application. */
export const addAgencySchema = z.object({
  name: z.string().trim().min(1, V.required).max(80, V.tooLong),
  legalName: z.string().trim().max(120, V.tooLong),
  cif: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[A-Z0-9]{8,12}$/i.test(v.replace(/[\s-]/g, "")), V.taxId),
  contactPerson: z.string().trim().min(1, V.required),
  email: z.string().trim().min(1, V.required).regex(RE.email, V.email),
  phone: z.string().trim().min(1, V.required).regex(RE.phone, V.phone),
  town: z.string().trim(),
  regions: z.array(z.enum(REGION_KEYS)).min(1, V.pickOne),
  status: z.enum(NEW_AGENCY_STATUSES),
  feedUrl: z.string().trim().refine(optionalMatch(RE.url), V.url),
});

/** Reason is optional; it goes into the rejection email. */
export const rejectApplicationSchema = z.object({
  reason: z.string().trim().max(500, V.tooLong),
});

/** The agency sees this reason, so it's required. */
export const hidePropertySchema = z.object({
  reason: z.string().trim().min(1, V.required).max(300, V.tooLong),
});

export const PAYMENT_FREQUENCIES = ["monthly", "quarterly", "yearly"] as const;
export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];
export const PREFERRED_LANGUAGES = ["en", "es"] as const;

const text = (max: number) => z.string().trim().max(max, V.tooLong);
const required = (max: number) => text(max).min(1, V.required);
/** "www.agency.com" is accepted and saved as "https://www.agency.com". */
const website = text(200)
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine(optionalMatch(RE.url), V.url);

/**
 * Public /join register form. Becomes an application the admin approves (Admin → Applications);
 * approving copies every field to the new agency. Company name is the legal name; the brand name
 * (or the company name when empty) is the name shown on the platform.
 */
export const agencyApplicationSchema = z.object({
  preferredLanguage: z.enum(PREFERRED_LANGUAGES),
  /** Agency or property developer (developers are free and appear in the admin's Developer CRM). */
  accountType: z.enum(ACCOUNT_TYPES).default("agency"),
  email: z.string().trim().min(1, V.required).regex(RE.email, V.email),
  companyName: required(120),
  brandName: text(80),
  /** Registro de Agentes de Intermediación Inmobiliaria de la Comunitat Valenciana */
  raicv: text(30),
  cif: addAgencySchema.shape.cif,
  website,
  street: text(120),
  town: required(80),
  province: required(60),
  postcode: z.string().trim().min(1, V.required).regex(RE.postcodeEs, V.postcode),
  ownerName: text(120),
  ownerIdNumber: text(20).refine((v) => v === "" || /^[A-Z0-9-]{5,20}$/i.test(v.replace(/\s/g, "")), V.idNumber),
  contactPerson: required(120),
  phone: z.string().trim().min(1, V.required).regex(RE.phone, V.phone),
  phone2: z.string().trim().refine(optionalMatch(RE.phone), V.phone),
  email2: z.string().trim().refine(optionalMatch(RE.email), V.email),
  crm: text(60),
  /** Only asked when the CRM is Inmovilla */
  crmAgencyNumber: text(40),
  paymentFrequency: z.union([z.literal(""), z.enum(PAYMENT_FREQUENCIES)]),
  iban: z.string().trim().refine((v) => v === "" || isValidIban(v), V.iban),
  acceptPrivacy: z.boolean().refine((v) => v, V.acceptPrivacy),
  /** Spam trap: a hidden field people never see. Bots fill it in; the server then saves nothing. */
  faxNumber: z.string().max(200).optional(),
});
