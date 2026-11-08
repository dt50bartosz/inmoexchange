// app/[locale]/blog/page.tsx
// Public blog: published posts, newest first, in the visitor's language when the post has it.
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Layout";
import BlogCard from "@/components/blog/BlogCard";
import { listPublishedPosts } from "@/lib/server/blog";
import type { BlogLang } from "@/lib/constants/blog";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blog");
  return { title: t("title"), description: t("metaDescription") };
}

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> };

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations("blog");
  const { posts, page, pageCount } = await listPublishedPosts(locale as BlogLang, Number((await searchParams).page) || 1);

  return (
    // Top padding clears the navbar, which sits over the page
    <Container className="pb-12 pt-14">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("subtitle")}</p>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <BlogCard key={p.id} post={p} locale={locale} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label={t("pagination")} className="mt-10 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={page === 2 ? "/blog" : `/blog?page=${page - 1}`} className="text-primary hover:underline">
              ← {t("newer")}
            </Link>
          ) : (
            <span className="text-muted-foreground/50">← {t("newer")}</span>
          )}
          <span className="text-muted-foreground">{t("pageOf", { page, pageCount })}</span>
          {page < pageCount ? (
            <Link href={`/blog?page=${page + 1}`} className="text-primary hover:underline">
              {t("older")} →
            </Link>
          ) : (
            <span className="text-muted-foreground/50">{t("older")} →</span>
          )}
        </nav>
      )}
    </Container>
  );
}
