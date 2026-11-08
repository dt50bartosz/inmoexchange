import { z } from "zod";
import { LANG_CODES, type LangCode } from "@/lib/constants/languages";
import { REGION_KEYS, SPOKEN_LANGUAGE_KEYS } from "@/lib/constants/options";
import { ABOUT_MAX } from "@/lib/constants/agency";
import { RE, V, normalizeWhatsapp, optionalMatch } from "./shared";

const langEnum = z.enum(LANG_CODES as [LangCode, ...LangCode[]]);
const optionalUrl = z.string().trim().refine(optionalMatch(RE.url), V.url);

export const agencySchema = z
  .object({
    name: z.string().trim().min(1, V.required).max(80, V.tooLong),
    logoUrl: z.string().nullable(),
    about: z.partialRecord(langEnum, z.string().max(ABOUT_MAX, V.tooLong)),
    defaultLanguage: langEnum,
    contactPerson: z.string().trim(),
    phone: z.string().trim().min(1, V.required).regex(RE.phone, V.phone),
    // Stored in international format (+34600000000): "Book a viewing on WhatsApp" needs it; empty = no button
    whatsapp: z.string().transform(normalizeWhatsapp).refine((v) => v === "" || RE.whatsapp.test(v), V.whatsapp),
    email: z.string().trim().min(1, V.required).regex(RE.email, V.email),
    website: optionalUrl,
    street: z.string().trim(),
    town: z.string().trim(),
    province: z.string().trim(),
    postcode: z.string().trim().refine(optionalMatch(RE.postcodeEs), V.postcode),
    regions: z.array(z.enum(REGION_KEYS)).min(1, V.pickOne),
    spokenLanguages: z.array(z.enum(SPOKEN_LANGUAGE_KEYS)),
    legalName: z.string().trim(),
    cif: z.string().trim(),
    founded: z.string().trim().refine(optionalMatch(RE.year), V.year),
    commission: z.string().trim().max(100, V.tooLong),
    facebook: optionalUrl,
    instagram: optionalUrl,
    linkedin: optionalUrl,
  })
  .superRefine((a, ctx) => {
    if (!a.about[a.defaultLanguage]?.trim()) {
      ctx.addIssue({ code: "custom", path: ["about", a.defaultLanguage], message: V.defaultLanguageText });
    }
  });

export type AgencyFormValues = z.input<typeof agencySchema>;
export type Agency = z.output<typeof agencySchema>;
