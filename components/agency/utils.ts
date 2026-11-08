export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "your-agency";

/** The site's own host for the preview's address bar (from NEXT_PUBLIC_BASE_URL, e.g. "colaboramls.es"); empty if not set. */
export const SITE_HOST = (process.env.NEXT_PUBLIC_BASE_URL ?? "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
