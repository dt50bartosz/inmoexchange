import type { ObjectId } from "mongodb";
import type { BlogLang, BlogStatus } from "@/lib/constants/blog";

export interface BlogTranslation {
  title: string;
  slug: string;
  excerpt: string;
  /** Sanitized HTML from the admin's rich-text editor. */
  content: string;
}

export type BlogTranslations = Partial<Record<BlogLang, BlogTranslation>>;

export interface BlogPostDoc {
  _id: ObjectId;
  translations: BlogTranslations;
  /** Shown when a visitor's language has no version. */
  defaultLanguage: BlogLang;
  coverUrl: string | null;
  status: BlogStatus;
  /** Set the first time the post is published; kept if it's unpublished and published again. */
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string; // admin email
}

/** A post as the admin editor sees it. */
export interface AdminBlogPost {
  id: string;
  translations: BlogTranslations;
  defaultLanguage: BlogLang;
  coverUrl: string | null;
  status: BlogStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One language version of a published post, for the public blog. */
export interface PublicBlogPost {
  id: string;
  lang: BlogLang;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl: string | null;
  publishedAt: string;
  /** Slug per language, for the language switcher and hreflang links. */
  slugs: Partial<Record<BlogLang, string>>;
}
