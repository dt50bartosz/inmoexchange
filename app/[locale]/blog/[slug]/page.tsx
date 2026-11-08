// app/[locale]/blog/[slug]/page.tsx
// One blog post. A link to another language's slug redirects to this language's version when it exists.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link, getPathname, redirect } from "@/i18n/navigation";
import { Container } from "@/components/ui/Layout";
import { findPublishedPost } from "@/lib/server/blog";
import { BLOG_LANG_LABEL, type BlogLang } from "@/lib/constants/blog";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const found = await findPublishedPost(locale as BlogLang, slug);
  if (!found?.post) return {};
  const p = found.post;
  return {
    title: p.title,
    description: p.excerpt || undefined,
    openGraph: { type: "article", title: p.title, description: p.excerpt || undefined, publishedTime: p.publishedAt, images: p.coverUrl ? [p.coverUrl] : undefined },
    alternates: {
      languages: Object.fromEntries(
        Object.entries(p.slugs).map(([l, s]) => [l, getPathname({ locale: l, href: `/blog/${s}` })])
      ),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const found = await findPublishedPost(locale as BlogLang, slug);
  if (!found) notFound();
  if (found.redirectTo) redirect({ href: `/blog/${found.redirectTo}`, locale });
  const post = found.post!;
  const t = await getTranslations("blog");
  const format = await getFormatter();

  return (
    <article className="pb-12 pt-14">
      <Container className="max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          {t("back")}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          <time dateTime={post.publishedAt}>{format.dateTime(new Date(post.publishedAt), { dateStyle: "long" })}</time>
        </p>
        {post.lang !== locale && (
          <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            {t("otherLanguage", { language: BLOG_LANG_LABEL[post.lang] })}
          </p>
        )}
      </Container>

      {post.coverUrl && (
        <Container className="mt-8 max-w-5xl">
          {/* eslint-disable-next-line @next/next/no-img-element -- R2 images aren't set up for next/image */}
          <img src={post.coverUrl} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />
        </Container>
      )}

      <Container className="mt-10 max-w-3xl">
        {post.excerpt && <p className="mb-8 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>}
        {/* Cleaned on save and again when loaded (cleanHtml in lib/server/blog.ts) */}
        <div className="blog-content text-[1.05rem]" dangerouslySetInnerHTML={{ __html: post.content }} />
      </Container>
    </article>
  );
}
