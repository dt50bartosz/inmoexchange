// lib/server/agency-profile.ts
// The agency's own profile (Mi agencia): database document ⇄ form values.
import "server-only";
import type { Agency } from "@/lib/schemas/agency";
import type { AgencyDoc } from "@/types/models";

/** Database document → the values the Mi agencia form edits. Missing fields become empty. */
export function toAgencyProfile(a: AgencyDoc): Agency {
  return {
    name: a.name,
    logoUrl: a.logo ?? null,
    about: a.about ?? {},
    defaultLanguage: a.defaultLanguage ?? "en",
    contactPerson: a.contactPerson ?? "",
    phone: a.phone ?? "",
    whatsapp: a.whatsapp ?? "",
    // Public contact email; until the agency sets one, start from the login email
    email: a.contactEmail || a.email || "",
    website: a.website ?? "",
    street: a.street ?? "",
    town: a.town ?? "",
    province: a.province ?? "",
    postcode: a.postcode ?? "",
    regions: a.regions ?? [],
    spokenLanguages: a.spokenLanguages ?? [],
    legalName: a.legalName ?? "",
    cif: a.cif ?? "",
    founded: a.founded ?? "",
    commission: a.commission ?? "",
    facebook: a.facebook ?? "",
    instagram: a.instagram ?? "",
    linkedin: a.linkedin ?? "",
  };
}

/** Validated form values → the fields saved on the agency. The logo is handled separately. */
export function profileUpdate(v: Agency): Partial<AgencyDoc> {
  const { logoUrl: _logo, email, ...rest } = v;
  return { ...rest, contactEmail: email };
}
