/** Public base URL for feed links: NEXT_PUBLIC_BASE_URL, the same setting as email and client page links. */
export const FEED_BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://inmoexchange.com").replace(/\/+$/, "");

export const feedUrl = (token: string) => `${FEED_BASE_URL}/feeds/${token}.xml`;

export const EXPORT_FORMAT = "kyero-v3" as const;
export const EXPORT_NAME_MAX = 60;
export const MIN_BEDS_OPTIONS = [0, 1, 2, 3, 4] as const;
