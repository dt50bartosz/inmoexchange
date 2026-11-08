// lib/server/blog.ts
// Blog posts: HTML cleaning, database ⇄ page shapes, and the public blog's queries.
import "server-only";
import sanitizeHtml from "sanitize-html";
import { collections, ensureIndexes } from "@/lib/db";
import { BLOG_LANGS, BLOG_PAGE_SIZE, BLOG_IMAGES_PREFIX, type BlogLang } from "@/lib/constants/blog";
import type { AdminBlogPost, BlogPostDoc, PublicBlogPost } from "@/types/blog";

/* ---------- HTML ---------- */

/**
 * Keeps only what the editor can make (headings, lists, links, images…), so no scripts, styles or
 * event attributes can reach a page. Runs when a post is saved and again when it's shown.
 */
export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "h2", "h3", "strong", "em", "u", "s", "a", "ul", "ol", "li", "blockquote", "hr", "img", "code", "pre"],
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "title"] },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    transformTags: {
      // Links to other sites open in a new tab and pass no referrer or ranking
      a: (tagName, attribs) => {
        const href = attribs.href ?? "";
        const external = /^https?:\/\//i.test(href) && !href.startsWith(siteUrl());
        const out: Record<string, string> = external ? { href, target: "_blank", rel: "noopener noreferrer nofollow" } : { href };
        return { tagName, attribs: out };
      },
    },
  });
}

const siteUrl = () => (process.env.NEXT_PUBLIC_BASE_URL || "https://inmoexchange.com").replace(/\/+$/, "");

/** Storage keys of the blog images a post uses (cover and inline), to delete the ones it no longer uses. */
export function blogImageKeys(p: Pick<BlogPostDoc, "coverUrl" | "translations">): Set<string> {
  const base = `${(process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "")}/`;
  const urls = [p.coverUrl ?? "", ...Object.values(p.translations).flatMap((t) => [...(t?.content ?? "").matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]))];
  return new Set(
    urls.filter((u) => base.length > 1 && u.startsWith(`${base}${BLOG_IMAGES_PREFIX}/`)).map((u) => u.slice(base.length))
  );
}

/* ---------- Shapes ---------- */

export function toAdminBlogPost(d: BlogPostDoc): AdminBlogPost {
  return {
    id: d._id.toHexString(),
    translations: d.translations,
    defaultLanguage: d.defaultLanguage,
    coverUrl: d.coverUrl,
    status: d.status,
    publishedAt: d.publishedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/** The post in `lang`, or in its default language when it has no `lang` version. */
function toPublic(d: BlogPostDoc, lang: BlogLang): PublicBlogPost {
  const shown = d.translations[lang] ? lang : d.defaultLanguage;
  const t = d.translations[shown]!;
  const slugs = Object.fromEntries(BLOG_LANGS.filter((l) => d.translations[l]).map((l) => [l, d.translations[l]!.slug]));
  return {
    id: d._id.toHexString(),
    lang: shown,
    title: t.title,
    slug: t.slug,
    excerpt: t.excerpt,
    content: cleanHtml(t.content),
    coverUrl: d.coverUrl,
    publishedAt: (d.publishedAt ?? d.createdAt).toISOString(),
    slugs,
  };
}

/* ---------- Public blog ---------- */

const PUBLISHED = { status: "published" as const };

/** One page of published posts, newest first, each in the visitor's language when it has one. */
export async function listPublishedPosts(lang: BlogLang, page: number) {
  const total = await collections.blogPosts.countDocuments(PUBLISHED);
  const pageCount = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pageCount);
  const docs = await collections.blogPosts
    .find(PUBLISHED)
    .sort({ publishedAt: -1 })
    .skip((current - 1) * BLOG_PAGE_SIZE)
    .limit(BLOG_PAGE_SIZE)
    .toArray();
  // The list only needs the excerpt, not the whole text
  return { posts: docs.map((d) => ({ ...toPublic(d, lang), content: "" })), page: current, pageCount };
}

/**
 * A published post by its slug in any language. `redirectTo` is set when the post has a version in
 * `lang` under another slug (e.g. a Spanish link opened on the English site), so the page can redirect there.
 */
export async function findPublishedPost(lang: BlogLang, slug: string) {
  await ensureIndexes();
  const doc = await collections.blogPosts.findOne({ ...PUBLISHED, $or: BLOG_LANGS.map((l) => ({ [`translations.${l}.slug`]: slug })) });
  if (!doc) return null;
  const own = doc.translations[lang];
  if (own && own.slug !== slug) return { redirectTo: own.slug };
  // No version in `lang`: show the one the slug belongs to
  const matched = BLOG_LANGS.find((l) => doc.translations[l]?.slug === slug)!;
  return { post: toPublic(doc, own ? lang : matched) };
}
