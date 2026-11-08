/** Blog posts are written in the site's languages; each post has a version per language. */
export const BLOG_LANGS = ["es", "en", "pl"] as const;
export type BlogLang = (typeof BLOG_LANGS)[number];

export const BLOG_LANG_LABEL: Record<BlogLang, string> = { es: "Español", en: "English", pl: "Polski" };

export const BLOG_STATUSES = ["draft", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export const BLOG_PAGE_SIZE = 9;
export const BLOG_TITLE_MAX = 160;
export const BLOG_EXCERPT_MAX = 300;
export const BLOG_SLUG_MAX = 100;
/** Stored HTML, so far more than the visible text; stops runaway pastes. */
export const BLOG_CONTENT_MAX = 200_000;

/** Uploaded cover and inline images go here in R2 (final place, no pending step: only admins upload). */
export const BLOG_IMAGES_PREFIX = "blog";

/** "Cómo comprar en España" → "como-comprar-en-espana" */
export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BLOG_SLUG_MAX);

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
