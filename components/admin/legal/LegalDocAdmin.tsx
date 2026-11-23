"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ExternalLink, FilePlus2, Send, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LocalTime from "@/components/developers/LocalTime";
import { useUnsavedWarning } from "@/components/panel/useUnsavedWarning";
import { ADMIN_ROUTES } from "@/lib/constants/admin";
import { LEGAL_DOCS, LEGAL_LANGS, hasPlaceholders, type LegalDocKey, type LegalLang } from "@/lib/constants/legal-docs";
import type { LegalDocVersion } from "@/types/legal";
import { deleteLegalDraftAction, publishLegalDraftAction, saveLegalDraftAction, startLegalDraftAction } from "@/app/[locale]/admin/legal/server/actions";
import RichTextEditor from "../blog/RichTextEditor";
import AdminPage from "../ui/AdminPage";
import ConfirmDialog from "../ui/ConfirmDialog";

const LANG_LABEL: Record<LegalLang, string> = { es: "Spanish (binding)", en: "English", pl: "Polish" };
const STATUS_VARIANT = { published: "secondary", draft: "outline", archived: "ghost" } as const;

type Props = { docKey: LegalDocKey; versions: LegalDocVersion[] };

export default function LegalDocAdmin({ docKey, versions }: Props) {
  const meta = LEGAL_DOCS[docKey];
  const router = useRouter();
  const draft = versions.find((v) => v.status === "draft") ?? null;
  const [busy, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<null | "publish" | "delete">(null);

  const start = () =>
    startTransition(async () => {
      const res = await startLegalDraftAction(docKey).catch(() => null);
      if (!res?.ok) toast.error(res?.error === "draft_exists" ? "There is already a draft." : "Couldn't start a draft. Try again.");
      router.refresh();
    });

  return (
    <AdminPage
      title={meta.label}
      description={`Public page: ${meta.path}. Spanish is the binding text; English and Polish fall back to Spanish when left empty.`}
      back={
        <Link href={ADMIN_ROUTES.legal} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" />
          Legal documents
        </Link>
      }
      actions={
        <>
          <a href={meta.path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ExternalLink aria-hidden className="size-4" />
            Open page
          </a>
          {!draft && (
            <Button type="button" onClick={start} disabled={busy}>
              <FilePlus2 aria-hidden className="size-4" />
              {versions.length ? "New version" : "Create first version"}
            </Button>
          )}
        </>
      }
    >
      {draft ? (
        <DraftEditor key={draft.id} draft={draft} onPublish={() => setConfirm("publish")} onDelete={() => setConfirm("delete")} busy={busy} />
      ) : (
        <p className="mb-6 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          {versions.length
            ? "No draft. “New version” copies the version in force into a draft you can edit; nothing changes publicly until you publish."
            : meta.builtIn
              ? "This page still shows its built-in text. “Create first version” starts a draft from a template with placeholders; the built-in text stays until you publish."
              : "Nothing published yet: the public page says the document is being prepared. “Create first version” starts a draft from a template with placeholders."}
        </p>
      )}

      <h2 className="mt-10 mb-3 text-lg font-semibold">Version history</h2>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Change note</TableHead>
              <TableHead>By</TableHead>
              <TableHead className="text-right">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No versions yet.
                </TableCell>
              </TableRow>
            ) : (
              versions.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">
                    v{v.version}
                    {v.material && <span className="ml-2 text-xs text-warning">material</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[v.status]}>{v.status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <LocalTime iso={v.publishedAt} mode="dateTime" />
                  </TableCell>
                  <TableCell className="max-w-[280px] text-sm">{v.changeNote || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{v.updatedBy.email}</TableCell>
                  <TableCell className="text-right">
                    {v.status !== "draft" && (
                      <a href={`${meta.path}?version=${encodeURIComponent(v.version)}`} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                        Open
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {draft && (
        <ConfirmDialog
          open={confirm !== null}
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirm === "publish" ? `Publish v${draft.version}?` : `Delete draft v${draft.version}?`}
          description={
            confirm === "publish"
              ? "It becomes the version in force straight away and the current version is archived. Published versions can't be edited: changes need a new version. Save your last edits first."
              : "The draft is deleted. Published versions are not affected."
          }
          confirmLabel={confirm === "publish" ? "Publish" : "Delete draft"}
          destructive={confirm === "delete"}
          onConfirm={() => {
            const which = confirm;
            setConfirm(null);
            startTransition(async () => {
              const res = which === "publish" ? await publishLegalDraftAction(draft.id).catch(() => null) : await deleteLegalDraftAction(draft.id).catch(() => null);
              if (!res?.ok) {
                toast.error(res && "error" in res && res.error === "empty" ? "Write the Spanish or English text before publishing." : "Something went wrong. Try again.");
                return;
              }
              toast.success(which === "publish" ? `v${draft.version} published.` : "Draft deleted.");
              router.refresh();
            });
          }}
        />
      )}
    </AdminPage>
  );
}

function DraftEditor({ draft, onPublish, onDelete, busy }: { draft: LegalDocVersion; onPublish: () => void; onDelete: () => void; busy: boolean }) {
  const router = useRouter();
  const [version, setVersion] = useState(draft.version);
  const [changeNote, setChangeNote] = useState(draft.changeNote);
  const [material, setMaterial] = useState(draft.material);
  const [title, setTitle] = useState(draft.title);
  const [content, setContent] = useState(draft.content);
  const [lang, setLang] = useState<LegalLang>("es");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const dirty =
    version !== draft.version || changeNote !== draft.changeNote || material !== draft.material || JSON.stringify(title) !== JSON.stringify(draft.title) || JSON.stringify(content) !== JSON.stringify(draft.content);
  useUnsavedWarning(dirty);
  const placeholders = LEGAL_LANGS.filter((l) => hasPlaceholders(content[l]));

  const save = () =>
    startSaving(async () => {
      const res = await saveLegalDraftAction(draft.id, { version, changeNote, material, title, content }).catch(() => null);
      if (!res?.ok) {
        setErrors(res && "fieldErrors" in res ? (res.fieldErrors ?? {}) : {});
        toast.error(res?.error === "version_taken" ? "That version number is already used for this document." : res?.error === "validation_error" ? "Check the highlighted fields." : "Couldn't save. Try again.");
        return;
      }
      setErrors({});
      toast.success("Draft saved.");
      router.refresh();
    });

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Draft v{draft.version}</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" className="text-destructive" onClick={onDelete} disabled={busy || saving}>
            <Trash2 aria-hidden className="size-4" />
            Delete draft
          </Button>
          <Button type="button" variant="outline" onClick={save} disabled={saving || busy || !dirty}>
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button type="button" onClick={onPublish} disabled={busy || saving || dirty} title={dirty ? "Save the draft first" : undefined}>
            <Send aria-hidden className="size-4" />
            Publish
          </Button>
        </div>
      </div>

      {placeholders.length > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          Placeholders still in the {placeholders.map((l) => LANG_LABEL[l]).join(", ")} text. You can publish, but the page will show them as “to be completed by a legal professional” and won&apos;t be indexed by search engines until they are gone.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
        <div>
          <label htmlFor="legal-version" className="mb-1.5 block text-sm font-medium">
            Version
          </label>
          <Input id="legal-version" value={version} onChange={(e) => setVersion(e.target.value)} aria-invalid={!!errors.version} />
          {errors.version && <p className="mt-1 text-xs text-destructive">{errors.version === "taken" ? "Already used" : "Letters, numbers, dots and dashes"}</p>}
        </div>
        <div>
          <label htmlFor="legal-note" className="mb-1.5 block text-sm font-medium">
            Change note (admin only)
          </label>
          <Textarea id="legal-note" rows={2} value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="What changed and why" />
        </div>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <Checkbox checked={material} onCheckedChange={(v) => setMaterial(!!v)} className="mt-0.5" />
        <span>
          <span className="font-medium">Material change</span>
          <span className="block text-muted-foreground">People who accepted an older version will be asked to accept this one again.</span>
        </span>
      </label>

      <div role="tablist" aria-label="Language" className="mt-6 flex gap-1 border-b">
        {LEGAL_LANGS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={lang === l}
            onClick={() => setLang(l)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${lang === l ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {LANG_LABEL[l]}
            {!content[l].trim() && <span className="ml-1 text-xs text-muted-foreground">(empty)</span>}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        <div>
          <label htmlFor={`legal-title-${lang}`} className="mb-1.5 block text-sm font-medium">
            Title
          </label>
          <Input
            id={`legal-title-${lang}`}
            value={title[lang]}
            onChange={(e) => setTitle((t) => ({ ...t, [lang]: e.target.value }))}
            aria-invalid={!!errors[`title.${lang}`]}
          />
        </div>
        <RichTextEditor key={lang} id={`legal-content-${lang}`} value={content[lang]} onChange={(html) => setContent((c) => ({ ...c, [lang]: html }))} allowImages={false} />
      </div>
    </section>
  );
}
