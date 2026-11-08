"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import SimpleSelect from "@/components/panel/SimpleSelect";
import { DOCUMENTS_MAX, DOCUMENT_KINDS, MAX_DOCUMENT_BYTES, type DocumentKind } from "@/lib/constants/developers";
import { uploadDocuments } from "@/lib/documents/upload-documents";
import type { createDeveloperDocumentUploadUrls } from "@/lib/actions/upload";

/** A document in the form: a saved one (url set) or a fresh upload (only its pending key). */
export type DocumentValue = { id: string; key: string; kind: DocumentKind; name: string; url?: string };

type Props = {
  value: DocumentValue[];
  onChange: (next: DocumentValue[]) => void;
  requestUrls: typeof createDeveloperDocumentUploadUrls;
  /** Index → error message key from the server ("document_invalid"). */
  errors?: Record<number, string | undefined>;
};

/** PDFs of a development: brochure, price list, plans, memoria de calidades… Each one gets a kind and a name. */
export default function DevelopmentDocumentsField({ value, onChange, requestUrls, errors = {} }: Props) {
  const t = useTranslations("Projects.documents");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const room = DOCUMENTS_MAX - value.length;

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = [...files].slice(0, room);
    setUploading(true);
    try {
      const { uploaded, rejected } = await uploadDocuments(list, requestUrls);
      if (uploaded.length) onChange([...value, ...uploaded.map((u) => ({ id: u.key, key: u.key, kind: "other" as const, name: u.name.slice(0, 120) }))]);
      for (const r of rejected) toast.error(t(`rejected.${r.reason}`, { name: r.name, mb: MAX_DOCUMENT_BYTES / 1024 / 1024 }));
      if (files.length > list.length) toast.error(t("tooMany", { max: DOCUMENTS_MAX }));
    } catch {
      toast.error(t("rejected.failed", { name: "" }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const update = (i: number, patch: Partial<DocumentValue>) => onChange(value.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <div className="grid gap-3">
      {value.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {value.map((doc, i) => (
            <li key={doc.id} className="grid gap-2 p-3 sm:grid-cols-[auto_minmax(0,1fr)_180px_auto] sm:items-center">
              <FileText aria-hidden className="hidden size-5 text-muted-foreground sm:block" />
              <div className="min-w-0">
                <Input aria-label={t("name")} value={doc.name} maxLength={120} onChange={(e) => update(i, { name: e.target.value })} aria-invalid={!!errors[i] || !doc.name.trim()} />
                {doc.url ? (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-brand-light underline underline-offset-2">
                    {t("open")}
                  </a>
                ) : (
                  <span className="mt-1 inline-block text-xs text-muted-foreground">{t("pending")}</span>
                )}
                {errors[i] && <p className="mt-1 text-xs text-destructive">{t("invalid")}</p>}
              </div>
              <SimpleSelect
                aria-label={t("kind")}
                value={doc.kind}
                onChange={(v) => update(i, { kind: v as DocumentKind })}
                options={DOCUMENT_KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
              />
              <Button type="button" variant="ghost" size="sm" className="justify-self-start text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden className="size-4" />
                <span className="sm:sr-only">{t("remove")}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <input ref={fileRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => pick(e.target.files)} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" disabled={uploading || room <= 0} onClick={() => fileRef.current?.click()}>
          <Upload aria-hidden className="size-4" />
          {uploading ? t("uploading") : t("add")}
        </Button>
        <span className="text-xs text-muted-foreground">{t("hint", { mb: MAX_DOCUMENT_BYTES / 1024 / 1024, max: DOCUMENTS_MAX })}</span>
      </div>
    </div>
  );
}
