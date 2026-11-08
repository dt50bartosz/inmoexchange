import { ABOUT_MAX, type Agency } from "@/types/agent";
import { langLabel, type LangCode } from "@/components/panel/languages";
import { RE } from "@/components/panel/validation";

/** Field name → error message. Missing key = field is valid. */
export type Errors = Partial<Record<string, string>>;

const isEmail = (v: string) => RE.email.test(v);
const isUrl = (v: string) => RE.url.test(v);
const isPhone = (v: string) => RE.phone.test(v);

export function validate(a: Agency): Errors {
  const e: Errors = {};

  if (!a.name.trim()) e.name = "Enter your agency name.";

  if (!a.email.trim()) e.email = "Enter an email address.";
  else if (!isEmail(a.email)) e.email = "Enter an email like name@agency.com.";

  if (!a.phone.trim()) e.phone = "Enter a phone number.";
  else if (!isPhone(a.phone)) e.phone = "Use digits only, with an optional + at the start.";

  if (a.whatsapp && !isPhone(a.whatsapp)) e.whatsapp = "Use digits only, with an optional + at the start.";
  if (a.website && !isUrl(a.website)) e.website = "Start the address with https://";
  for (const k of ["facebook", "instagram", "linkedin"] as const) {
    if (a[k] && !isUrl(a[k])) e[k] = "Paste the full link, starting with https://";
  }

  if (a.founded && !RE.year.test(a.founded)) e.founded = "Enter a year, e.g. 2014.";
  if (a.postcode && !RE.postcodeEs.test(a.postcode)) e.postcode = "Spanish postcodes have 5 digits.";
  if (a.regions.length === 0) e.regions = "Pick at least one area you work in.";

  // About page: default language is required, every language has a length limit
  if (!a.about[a.defaultLanguage]?.trim()) {
    e[`about.${a.defaultLanguage}`] = `Write your ${langLabel(
      a.defaultLanguage
    )} text. Clients see it when their language isn't available.`;
  }
  for (const code of Object.keys(a.about) as LangCode[]) {
    if ((a.about[code]?.length ?? 0) > ABOUT_MAX) {
      e[`about.${code}`] = `Keep it under ${ABOUT_MAX} characters.`;
    }
  }

  return e;
}