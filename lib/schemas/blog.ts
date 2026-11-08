import { z } from "zod";
import {
  BLOG_CONTENT_MAX,
  BLOG_EXCERPT_MAX,
  BLOG_LANGS,
  BLOG_SLUG_MAX,
  BLOG_STATUSES,
  BLOG_TITLE_MAX,
  SLUG_RE,
} from "@/lib/constants/blog";
import { V } from "./shared";

/** Text of the editor's HTML (tags removed), to tell an empty editor ("<p></p>") from a real one. */
export const htmlHasContent = (html: string) => /<img\s/i.test(html) || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() !== "";

const translationSchema = z.object({
  title: z.string().trim().max(BLOG_TITLE_MAX, V.tooLong),
  // Empty = made from the title on save
  slug: z.string().trim().toLowerCase().max(BLOG_SLUG_MAX, V.tooLong).refine((v) => v === "" || SLUG_RE.test(v), V.slug),
  excerpt: z.string().trim().max(BLOG_EXCERPT_MAX, V.tooLong),
  content: z.string().max(BLOG_CONTENT_MAX, V.tooLong),
});

/** The admin's post form. A language version needs a title and text; the default language must have one. */
export const blogPostSchema = z
  .object({
    translations: z.partialRecord(z.enum(BLOG_LANGS), translationSchema),
    defaultLanguage: z.enum(BLOG_LANGS),
    coverUrl: z.string().url().nullable(),
    status: z.enum(BLOG_STATUSES),
  })
  .superRefine((p, ctx) => {
    for (const lang of BLOG_LANGS) {
      const t = p.translations[lang];
      if (!t && lang !== p.defaultLanguage) continue;
      if (!t?.title) ctx.addIssue({ code: "custom", path: ["translations", lang, "title"], message: V.required });
      if (!t || !htmlHasContent(t.content)) ctx.addIssue({ code: "custom", path: ["translations", lang, "content"], message: V.required });
    }
  });

export type BlogPostValues = z.infer<typeof blogPostSchema>;
