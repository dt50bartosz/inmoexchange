// app/[locale]/admin/blog/server/actions.ts
"use server";

import { randomUUID } from "node:crypto";
import { ObjectId, MongoServerError } from "mongodb";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { collections, ensureIndexes } from "@/lib/db";
import { fail, ok, zodFieldErrors, type ActionResult } from "@/lib/server/action-result";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { blogImageKeys, cleanHtml, toAdminBlogPost } from "@/lib/server/blog";
import { getR2, publicImageUrl, r2Bucket } from "@/lib/server/r2";
import { deleteKeys } from "@/lib/server/storage";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, UPLOAD_URL_TTL_SECONDS, extensionFor } from "@/lib/images/config";
import { BLOG_IMAGES_PREFIX, BLOG_LANGS, slugify } from "@/lib/constants/blog";
import { blogPostSchema } from "@/lib/schemas/blog";
import { V } from "@/lib/schemas/shared";
import type { AdminBlogPost, BlogPostDoc, BlogTranslations } from "@/types/blog";

/*
 * Admin → Blog. Every action checks for an admin first.
 * The post's HTML is cleaned here (lib/server/blog.ts), whatever the browser sent.
 */

/** Creates a post (`id` null) or saves one. Empty slugs are made from the title. */
export async function saveBlogPostAction(id: string | null, input: unknown): Promise<ActionResult<AdminBlogPost>> {
  const admin = await requireAdmin();
  const parsed = blogPostSchema.safeParse(input);
  if (!parsed.success) return fail("validation_error", zodFieldErrors(parsed.error));
  const v = parsed.data;

  const current = id ? (ObjectId.isValid(id) ? await collections.blogPosts.findOne({ _id: new ObjectId(id) }) : null) : null;
  if (id && !current) return fail("not_found");
  const _id = current?._id ?? new ObjectId();

  const translations: BlogTranslations = {};
  const fieldErrors: Record<string, string> = {};
  for (const lang of BLOG_LANGS) {
    const t = v.translations[lang];
    if (!t) continue;
    const slug = t.slug || slugify(t.title) || `post-${_id.toHexString().slice(-6)}`;
    const taken = await collections.blogPosts.findOne({ [`translations.${lang}.slug`]: slug, _id: { $ne: _id } }, { projection: { _id: 1 } });
    if (taken) fieldErrors[`translations.${lang}.slug`] = V.slugTaken;
    translations[lang] = { title: t.title, slug, excerpt: t.excerpt, content: cleanHtml(t.content) };
  }
  if (Object.keys(fieldErrors).length) return fail("validation_error", fieldErrors);

  const now = new Date();
  const doc: BlogPostDoc = {
    _id,
    translations,
    defaultLanguage: v.defaultLanguage,
    coverUrl: v.coverUrl,
    status: v.status,
    publishedAt: v.status === "published" ? (current?.publishedAt ?? now) : (current?.publishedAt ?? null),
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    updatedBy: admin.email,
  };

  await ensureIndexes(); // unique slug per language
  try {
    await collections.blogPosts.replaceOne({ _id }, doc, { upsert: true });
  } catch (err) {
    // Two saves raced for the same slug
    if (err instanceof MongoServerError && err.code === 11000) {
      const lang = BLOG_LANGS.find((l) => String(err.message).includes(`slug_${l}_unique`)) ?? v.defaultLanguage;
      return fail("validation_error", { [`translations.${lang}.slug`]: V.slugTaken });
    }
    throw err;
  }

  // Images the post no longer uses
  if (current) {
    const keep = blogImageKeys(doc);
    const unused = [...blogImageKeys(current)].filter((k) => !keep.has(k));
    if (unused.length) await deleteKeys(unused).catch(() => {});
  }
  return ok(toAdminBlogPost(doc));
}

export async function deleteBlogPostAction(id: string): Promise<ActionResult<null>> {
  await requireAdmin();
  if (!ObjectId.isValid(id)) return fail("not_found");
  const doc = await collections.blogPosts.findOneAndDelete({ _id: new ObjectId(id) });
  if (!doc) return fail("not_found");
  const keys = [...blogImageKeys(doc)];
  if (keys.length) await deleteKeys(keys).catch(() => {});
  return ok(null);
}

const uploadSchema = z.object({
  contentType: z.enum(ALLOWED_UPLOAD_TYPES),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

/**
 * A signed URL for one blog image (cover or inline), straight into the blog folder,
 * plus the public URL to put in the post. Images the post ends up not using are deleted on save.
 */
export async function createBlogImageUploadAction(
  input: unknown
): Promise<ActionResult<{ uploadUrl: string; url: string }, "invalid_files" | "server_error">> {
  await requireAdmin();
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_files");
  const { contentType, size } = parsed.data;
  try {
    const key = `${BLOG_IMAGES_PREFIX}/${randomUUID()}.${extensionFor(contentType)}`;
    const uploadUrl = await getSignedUrl(
      getR2(),
      new PutObjectCommand({ Bucket: r2Bucket(), Key: key, ContentType: contentType, ContentLength: size }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) }
    );
    return ok({ uploadUrl, url: publicImageUrl(key) });
  } catch (error) {
    console.error("createBlogImageUploadAction failed", error);
    return fail("server_error");
  }
}
