/** Shared option keys. Labels live in messages under panel.options.* */
export const REGION_KEYS = [
  "costaBlancaNorth",
  "costaBlancaSouth",
  "costaCalida",
  "costaDelSol",
  "costaAlmeria",
  "inlandAlicante",
  "inlandMurcia",
] as const;
export type RegionKey = (typeof REGION_KEYS)[number];

export const SPOKEN_LANGUAGE_KEYS = ["en", "es", "pl", "de", "fr", "nl", "sv", "no", "ru"] as const;
export type SpokenLanguageKey = (typeof SPOKEN_LANGUAGE_KEYS)[number];
