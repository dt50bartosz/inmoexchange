"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ExternalLink, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import FormField from "@/components/panel/FormField";
import PanelCard from "@/components/panel/PanelCard";
import { useUnsavedWarning } from "@/components/panel/useUnsavedWarning";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import {
  BLOG_EXCERPT_MAX,
  BLOG_LANGS,
  BLOG_LANG_LABEL,
  BLOG_TITLE_MAX,
  slugify,
  type BlogLang,
  type BlogStatus,
} from "@/lib/constants/blog";
import { FILE_INPUT_ACCEPT } from "@/lib/images/config";
import { blogPostSchema, htmlHasContent } from "@/lib/schemas/blog";
import { zodIssuesToErrors } from "./errors";
import type { AdminBlogPost, BlogTranslation } from "@/types/blog";
import AdminPage from "../ui/AdminPage";
import ConfirmDialog from "../ui/ConfirmDialog";
import RichTextEditor from "./RichTextEditor";
import { uploadBlogImage } from "./upload-blog-image";
import { deleteBlogPostAction, saveBlogPostAction } from "@/app/[locale]/admin/blog/server/actions";

const EMPTY: BlogTranslation = { title: "", slug: "", excerpt: "", content: "" };

type Values = {
  translations: Record<BlogLang, BlogTranslation>;
  defaultLanguage: BlogLang;
  coverUrl: string | null;
  status: BlogStatus;
};

function toValues(p?: AdminBlogPost): Values {
  return {
    translations: Object.fromEntries(BLOG_LANGS.map((l) => [l, { ...EMPTY, ...p?.translations[l] }])) as Values["translations"],
    defaultLanguage: p?.defaultLanguage ?? "es",
    coverUrl: p?.coverUrl ?? null,
    status: p?.status ?? "draft",
  };
}

const isFilled = (t: BlogTranslation) => !!(t.title.trim() || t.slug.trim() || t.excerpt.trim() || htmlHasContent(t.content));

/** What's sent to the server: only the languages that have something written. */
function toPayload(v: Values) {
  return { ...v, translations: Object.fromEntries(BLOG_LANGS.filter((l) => isFilled(v.translations[l])).map((l) => [l, v.translations[l]])) };
}

/** Public address of a post: Spanish has no prefix. */
const postPath = (lang: BlogLang, slug: string) => `${lang === "es" ? "" : `/${lang}`}/blog/${slug}`;

/** `post` is undefined when writing a new one. */
export default function BlogPostEditor({ post }: { post?: AdminBlogPost }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => toValues(post));
  const [values, setValues] = useState(saved);
  const [lang, setLang] = useState<BlogLang>(saved.defaultLanguage);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  useUnsavedWarning(dirty);

  const t = values.translations[lang];
  const err = (field: keyof BlogTranslation) => errors[`translations.${lang}.${field}`];
  const setField = (field: keyof BlogTranslation, value: string) => {
    setValues((v) => ({ ...v, translations: { ...v.translations, [lang]: { ...v.translations[lang], [field]: value } } }));
    setErrors(({ [`translations.${lang}.${field}`]: _, ...rest }) => rest);
  };

  /** Shows errors and opens the first language that has one. */
  const showErrors = (next: Record<string, string>) => {
    setErrors(next);
    const first = BLOG_LANGS.find((l) => Object.keys(next).some((k) => k.startsWith(`translations.${l}.`)));
    if (first) setLang(first);
    toast.error("Some fields need fixing before you can save.");
  };

  const save = async () => {
    const payload = toPayload(values);
    const check = blogPostSchema.safeParse(payload);
    if (!check.success) return showErrors(zodIssuesToErrors(check.error));
    setSaving(true);
    try {
      const res = await saveBlogPostAction(post?.id ?? null, payload);
      if (!res.ok) {
        if (res.error === "validation_error" && res.fieldErrors) showErrors(res.fieldErrors);
        else toast.error(res.error === "not_found" ? "This post was deleted." : "Couldn't save the post. Try again.");
        return;
      }
      const next = toValues(res.data);
      setSaved(next);
      setValues(next);
      setErrors({});
      toast.success(res.data.status === "published" ? "Post saved and published." : "Draft saved.");
      if (!post) router.replace(ADMIN_ROUTES.blogPost(res.data.id));
      else router.refresh();
    } catch {
      toast.error("Couldn't save the post. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const uploadCover = async (file: File) => {
    setCoverUploading(true);
    try {
      const url = await uploadBlogImage(file);
      setValues((v) => ({ ...v, coverUrl: url }));
    } catch {
      toast.error("Couldn't upload the image. Use a JPG, PNG, WebP or HEIC photo up to 20 MB.");
    } finally {
      setCoverUploading(false);
    }
  };

  const remove = async () => {
    if (!post) return;
    const res = await deleteBlogPostAction(post.id);
    if (!res.ok) return void toast.error("Couldn't delete the post.");
    toast.success("Post deleted.");
    setSaved(values); // no leave-page warning
    router.push(ADMIN_ROUTES.blog);
  };

  const live = post?.status === "published" ? saved.translations[saved.defaultLanguage] : null;

  return (
    <AdminPage
      title={post ? saved.translations[saved.defaultLanguage].title || "Edit post" : "New post"}
      description="Write the post in each language you want. Visitors see their language, or the default one when it's missing."
      back={
        <Link href={ADMIN_ROUTES.blog} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Blog
        </Link>
      }
      actions={
        live?.slug && (
          <a href={postPath(saved.defaultLanguage, live.slug)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            View on site <ExternalLink aria-hidden className="size-3.5" />
          </a>
        )
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <PanelCard className="p-5 sm:p-6">
          {/* Language tabs */}
          <div role="tablist" aria-label="Language" className="mb-5 flex flex-wrap gap-1 border-b border-border">
            {BLOG_LANGS.map((l) => {
              const hasError = Object.keys(errors).some((k) => k.startsWith(`translations.${l}.`));
              const filled = isFilled(values.translations[l]);
              return (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={l === lang}
                  onClick={() => setLang(l)}
                  className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    l === lang ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span aria-hidden className={`size-2 rounded-full ${hasError ? "bg-destructive" : filled ? "bg-primary" : "border border-muted-foreground"}`} />
                  {BLOG_LANG_LABEL[l]}
                  {l === values.defaultLanguage && <span className="text-xs text-muted-foreground">(default)</span>}
                  <span className="sr-only">{hasError ? ", has errors" : filled ? ", written" : ", empty"}</span>
                </button>
              );
            })}
          </div>

          <div role="tabpanel" className="space-y-5">
            <FormField label="Title" required={lang === values.defaultLanguage} error={err("title")} hint={`${t.title.length}/${BLOG_TITLE_MAX}`}>
              {(p) => <Input {...p} value={t.title} maxLength={BLOG_TITLE_MAX} onChange={(e) => setField("title", e.target.value)} />}
            </FormField>
            <FormField label="Address (slug)" error={err("slug")} hint="Empty = made from the title">
              {(p) => (
                <div className="flex items-center rounded-lg border border-input focus-within:ring-2 focus-within:ring-ring">
                  <span className="pl-3 text-sm whitespace-nowrap text-muted-foreground">{postPath(lang, "")}</span>
                  <input
                    {...p}
                    value={t.slug}
                    placeholder={slugify(t.title) || "my-post"}
                    onChange={(e) => setField("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    className="h-9 min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none"
                  />
                </div>
              )}
            </FormField>
            <FormField label="Summary" error={err("excerpt")} hint={`${t.excerpt.length}/${BLOG_EXCERPT_MAX}`}>
              {(p) => (
                <Textarea
                  {...p}
                  rows={2}
                  value={t.excerpt}
                  maxLength={BLOG_EXCERPT_MAX}
                  placeholder="One or two sentences for the blog list and search results."
                  onChange={(e) => setField("excerpt", e.target.value)}
                />
              )}
            </FormField>
            <FormField label="Text" required={lang === values.defaultLanguage} error={err("content")}>
              {(p) => (
                // A new editor per language, so switching tabs shows that language's text
                <RichTextEditor
                  key={lang}
                  id={p.id}
                  value={t.content}
                  onChange={(html) => setField("content", html)}
                  invalid={p["aria-invalid"]}
                  describedBy={p["aria-describedby"]}
                />
              )}
            </FormField>
            {lang !== values.defaultLanguage && isFilled(t) && (
              <Button type="button" variant="link" size="sm" className="px-0" onClick={() => setValues((v) => ({ ...v, defaultLanguage: lang }))}>
                Make {BLOG_LANG_LABEL[lang]} the default language
              </Button>
            )}
          </div>
        </PanelCard>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <PanelCard className="space-y-4 p-5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Status</legend>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                {(["draft", "published"] as const).map((s) => (
                  <label
                    key={s}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-center text-sm has-focus-visible:ring-2 has-focus-visible:ring-ring ${
                      values.status === s ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <input type="radio" name="status" value={s} checked={values.status === s} onChange={() => setValues((v) => ({ ...v, status: s }))} className="sr-only" />
                    {s === "draft" ? "Draft" : "Published"}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {values.status === "draft" ? "Only admins can see drafts." : "Visible on the blog after you save."}
              </p>
            </fieldset>
            <Button type="button" className="w-full" onClick={save} disabled={saving || (!dirty && !!post)}>
              {saving && <Loader2 aria-hidden className="size-4 animate-spin" />}
              {saving ? "Saving…" : post ? (dirty ? "Save changes" : "Saved") : "Create post"}
            </Button>
          </PanelCard>

          <PanelCard className="space-y-3 p-5">
            <h2 className="text-sm font-medium">Cover image</h2>
            {values.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- R2 images aren't set up for next/image
              <img src={values.coverUrl} alt="" className="aspect-[16/9] w-full rounded-lg object-cover" />
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">No cover image</div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={coverUploading} onClick={() => coverInput.current?.click()}>
                {coverUploading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <ImagePlus aria-hidden className="size-4" />}
                {values.coverUrl ? "Replace" : "Upload"}
              </Button>
              {values.coverUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setValues((v) => ({ ...v, coverUrl: null }))}>
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={coverInput}
              type="file"
              accept={FILE_INPUT_ACCEPT}
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadCover(file);
              }}
            />
          </PanelCard>

          {post && (
            <Button type="button" variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden className="size-4" />
              Delete post
            </Button>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this post?"
        description="The post and its images are deleted in every language. This can't be undone."
        confirmLabel="Delete post"
        destructive
        onConfirm={remove}
      />
    </AdminPage>
  );
}
