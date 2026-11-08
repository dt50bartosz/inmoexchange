import { notFound } from "next/navigation";
import { connection } from "next/server";
import BlogPostEditor from "@/components/admin/blog/BlogPostEditor";
import { getBlogPost } from "@/lib/server/admin/blog";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const post = await getBlogPost((await params).id);
  if (!post) notFound();
  return <BlogPostEditor post={post} />;
}
