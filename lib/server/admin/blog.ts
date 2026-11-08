// lib/server/admin/blog.ts
import "server-only";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { toAdminBlogPost } from "@/lib/server/blog";
import type { AdminBlogPost } from "@/types/blog";

/** Every post (drafts too), most recently changed first. */
export async function listBlogPosts(): Promise<AdminBlogPost[]> {
  await requireAdmin();
  const docs = await collections.blogPosts.find().sort({ updatedAt: -1 }).toArray();
  return docs.map(toAdminBlogPost);
}

export async function getBlogPost(id: string): Promise<AdminBlogPost | null> {
  await requireAdmin();
  if (!ObjectId.isValid(id)) return null;
  const doc = await collections.blogPosts.findOne({ _id: new ObjectId(id) });
  return doc ? toAdminBlogPost(doc) : null;
}
