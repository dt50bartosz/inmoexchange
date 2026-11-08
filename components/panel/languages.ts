/** Languages agencies can write content in (About page, property descriptions). */
export const CONTENT_LANGUAGES = [
  { code: "en", label: "English", aboutHeading: "About us" },
  { code: "es", label: "Español", aboutHeading: "Sobre nosotros" },
  { code: "pl", label: "Polski", aboutHeading: "O nas" },
  { code: "de", label: "Deutsch", aboutHeading: "Über uns" },
  { code: "fr", label: "Français", aboutHeading: "À propos de nous" },
  { code: "nl", label: "Nederlands", aboutHeading: "Over ons" },
  { code: "sv", label: "Svenska", aboutHeading: "Om oss" },
  { code: "no", label: "Norsk", aboutHeading: "Om oss" },
  { code: "ru", label: "Русский", aboutHeading: "О нас" },
] as const;

export type LangCode = (typeof CONTENT_LANGUAGES)[number]["code"];

export const LANG_CODES = CONTENT_LANGUAGES.map((l) => l.code) as LangCode[];

/** Native name, so it reads the same whatever language the panel is in. */
export const langLabel = (code: LangCode) => CONTENT_LANGUAGES.find((l) => l.code === code)?.label ?? code;

export type MultiLangText = Partial<Record<LangCode, string>>;

/** Languages present in a text map, in a stable order, `first` (e.g. the default) at the front. */
export function orderedLangs(value: MultiLangText, first?: LangCode): LangCode[] {
  const present = LANG_CODES.filter((c) => value[c] !== undefined);
  return first && present.includes(first) ? [first, ...present.filter((c) => c !== first)] : present;
}
