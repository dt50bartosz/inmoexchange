import { z } from "zod";
import { REGION_KEYS } from "@/lib/constants/options";
import { addAgencySchema } from "./admin";
import { RE, V, optionalMatch } from "./shared";

/*
 * The developer's company profile: what the developer edits in /promotor/perfil and the admin edits on its behalf.
 * One schema for both (the admin's CRM form adds its own fields on top, see lib/schemas/developers.ts).
 * Messages are translation keys under panel.validation (FormField translates them).
 */

export const PROFILE_DESCRIPTION_MAX = 3000;

const text = (max: number) => z.string().trim().max(max, V.tooLong);

/** "www.dev.com" is accepted and saved as "https://www.dev.com". */
const website = text(200)
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine(optionalMatch(RE.url), V.url);

export const companyProfileSchema = z.object({
  name: text(80).min(1, V.required),
  legalName: text(120),
  cif: addAgencySchema.shape.cif,
  /** Shown to agencies on the developer's developments. */
  description: z.object({ es: text(PROFILE_DESCRIPTION_MAX), en: text(PROFILE_DESCRIPTION_MAX) }),
  website,
  contactPerson: text(120),
  contactPosition: text(80),
  contactEmail: z.string().trim().refine(optionalMatch(RE.email), V.email),
  phone: z.string().trim().refine(optionalMatch(RE.phone), V.phone),
  street: text(120),
  town: text(80),
  postcode: text(12),
  province: text(60),
  country: text(60),
  /** Zones they build in. */
  regions: z.array(z.enum(REGION_KEYS)),
});

export type CompanyProfileValues = z.input<typeof companyProfileSchema>;
export type CompanyProfile = z.output<typeof companyProfileSchema>;

export const EMPTY_COMPANY_PROFILE: CompanyProfileValues = {
  name: "",
  legalName: "",
  cif: "",
  description: { es: "", en: "" },
  website: "",
  contactPerson: "",
  contactPosition: "",
  contactEmail: "",
  phone: "",
  street: "",
  town: "",
  postcode: "",
  province: "",
  country: "Spain",
  regions: [],
};
