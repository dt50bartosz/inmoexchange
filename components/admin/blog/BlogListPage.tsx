"use client";

import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { BLOG_LANGS } from "@/lib/constants/blog";
import type { AdminBlogPost } from "@/types/blog";
import AdminPage from "../ui/AdminPage";
import { useAdminFormat } from "../ui/useAdminFormat";

export default function BlogListPage({ posts }: { posts: AdminBlogPost[] }) {
  const f = useAdminFormat();

  return (
    <AdminPage
      title="Blog"
      description="Posts on the public blog. Drafts are only visible here."
      actions={
        <Link href={ADMIN_ROUTES.newBlogPost} className={buttonVariants()}>
          <Plus aria-hidden className="size-4" />
          New post
        </Link>
      }
    >
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Languages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Last change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No posts yet. <Link href={ADMIN_ROUTES.newBlogPost} className="text-primary hover:underline">Write the first one</Link>.
                </TableCell>
              </TableRow>
            ) : (
              posts.map((p) => {
                const main = p.translations[p.defaultLanguage];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[360px]">
                      <Link href={ADMIN_ROUTES.blogPost(p.id)} className="block truncate font-medium hover:underline">
                        {main?.title || "(no title)"}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">/blog/{main?.slug}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {BLOG_LANGS.filter((l) => p.translations[l]).map((l) => (
                          <Badge key={l} variant={l === p.defaultLanguage ? "secondary" : "outline"} className="uppercase">
                            {l}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.status === "published" ? <Badge>Published</Badge> : <Badge variant="outline" className="text-muted-foreground">Draft</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.publishedAt ? f.date(p.publishedAt) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{f.dateTime(p.updatedAt)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </AdminPage>
  );
}
