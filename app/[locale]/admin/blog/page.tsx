import { connection } from "next/server";
import BlogListPage from "@/components/admin/blog/BlogListPage";
import { listBlogPosts } from "@/lib/server/admin/blog";

export default async function Page() {
  await connection(); // always read fresh data, never prerender at build
  return <BlogListPage posts={await listBlogPosts()} />;
}
