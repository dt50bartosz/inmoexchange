import { requireAdmin } from "@/lib/server/admin/current-admin";
import BlogPostEditor from "@/components/admin/blog/BlogPostEditor";

export default async function Page() {
  await requireAdmin();
  return <BlogPostEditor />;
}
