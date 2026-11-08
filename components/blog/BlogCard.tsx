import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BLOG_LANG_LABEL } from "@/lib/constants/blog";
import type { PublicBlogPost } from "@/types/blog";

/** One post in the blog list. `locale` tells whether the post is shown in another language. */
export default async function BlogCard({ post, locale }: { post: PublicBlogPost; locale: string }) {
  const t = await getTranslations("blog");
  const format = await getFormatter();

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md">
      <Link href={`/blog/${post.slug}`} className="block aspect-[16/9] overflow-hidden bg-muted" tabIndex={-1} aria-hidden>
        {post.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- R2 images aren't set up for next/image
          <img src={post.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-muted-foreground">
          <time dateTime={post.publishedAt}>{format.dateTime(new Date(post.publishedAt), { dateStyle: "long" })}</time>
          {post.lang !== locale && <> · {BLOG_LANG_LABEL[post.lang]}</>}
        </p>
        <h2 className="mt-2 text-lg font-semibold leading-snug">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>}
        <Link href={`/blog/${post.slug}`} className="mt-auto pt-4 text-sm font-medium text-primary hover:underline">
          {t("readMore")}
          <span className="sr-only">: {post.title}</span>
        </Link>
      </div>
    </article>
  );
}
