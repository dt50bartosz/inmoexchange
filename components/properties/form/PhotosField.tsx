"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PHOTO_MAX_COUNT } from "@/lib/constants/property";
import { FILE_INPUT_ACCEPT } from "@/lib/images/config";
import { uploadImages } from "@/lib/images/upload-images";
import type { PropertyPhoto } from "@/lib/schemas/property";

type Props = {
  value: PropertyPhoto[];
  onChange: (photos: PropertyPhoto[]) => void;
  disabled?: boolean;
  /** Lets the form block saving while photos are still uploading. */
  onUploadingChange?: (uploading: boolean) => void;
};

const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/*
 * Photos are resized in the browser (max 2000px, WebP, GPS data removed) and
 * uploaded straight to R2 into a temporary "pending" folder. They're moved to
 * the property's folder when the form is saved.
 */
export default function PhotosField({ value, onChange, disabled, onUploadingChange }: Props) {
  const t = useTranslations("panel.properties.form.photos");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // Uploads finish after a wait, so always add to the latest list.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const uploading = progress !== null;
  const full = value.length >= PHOTO_MAX_COUNT;

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || uploading) return;
    const files = Array.from(fileList);
    const room = PHOTO_MAX_COUNT - value.length;
    if (files.length > room) toast.error(t("tooMany", { max: PHOTO_MAX_COUNT }));
    const batch = files.slice(0, Math.max(room, 0));
    if (!batch.length) return;

    setProgress({ done: 0, total: batch.length });
    onUploadingChange?.(true);
    try {
      const { uploaded, rejected } = await uploadImages(batch, {
        onProgress: (done, total) => setProgress({ done, total }),
      });
      if (rejected.length) toast.error(t("rejected", { count: rejected.length }));
      if (uploaded.length) {
        onChange([
          ...valueRef.current,
          ...uploaded.map((u) => ({ id: u.key, url: u.previewUrl, key: u.key, width: u.width, height: u.height })),
        ]);
      }
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setProgress(null);
      onUploadingChange?.(false);
    }
  };

  const remove = (i: number) => {
    const url = value[i].url;
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    onChange(value.filter((_, j) => j !== i));
  };

  return (
    <div>
      {!disabled && (
        <div
          onDragOver={(e) => {
            if (dragIndex !== null || uploading) return;
            e.preventDefault();
            setDropping(true);
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={(e) => {
            if (dragIndex !== null || uploading) return;
            e.preventDefault();
            setDropping(false);
            void addFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center ${
            dropping ? "border-primary bg-primary/5" : ""
          }`}
        >
          {uploading ? (
            <>
              <Loader2 aria-hidden className="size-7 animate-spin text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                {t("uploading", { done: progress.done, total: progress.total })}
              </p>
            </>
          ) : (
            <>
              <ImagePlus aria-hidden className="size-7 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">{t("dropHere")}</p>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={full || uploading}
          >
            {t("choose")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("limits", { max: PHOTO_MAX_COUNT })}</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={FILE_INPUT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {value.length > 0 ? (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {value.map((photo, i) => (
              <li
                key={photo.id}
                draggable={!disabled}
                onDragStart={() => setDragIndex(i)}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(e) => dragIndex !== null && e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== i) onChange(move(value, dragIndex, i));
                  setDragIndex(null);
                }}
                className={`group relative overflow-hidden rounded-lg border bg-muted ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""} ${dragIndex === i ? "opacity-50" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={t("photoAlt", { n: i + 1 })} className="aspect-[4/3] h-full w-full object-cover" />
                {i === 0 && <Badge className="absolute top-2 left-2">{t("main")}</Badge>}
                {!disabled && (
                  <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <div className="flex gap-1">
                      <Button type="button" size="icon-xs" variant="secondary" disabled={i === 0} aria-label={t("moveLeft", { n: i + 1 })} onClick={() => onChange(move(value, i, i - 1))}>
                        <ArrowLeft aria-hidden />
                      </Button>
                      <Button type="button" size="icon-xs" variant="secondary" disabled={i === value.length - 1} aria-label={t("moveRight", { n: i + 1 })} onClick={() => onChange(move(value, i, i + 1))}>
                        <ArrowRight aria-hidden />
                      </Button>
                      {i > 0 && (
                        <Button type="button" size="icon-xs" variant="secondary" aria-label={t("makeMain", { n: i + 1 })} onClick={() => onChange(move(value, i, 0))}>
                          <Star aria-hidden />
                        </Button>
                      )}
                    </div>
                    <Button type="button" size="icon-xs" variant="destructive" aria-label={t("remove", { n: i + 1 })} onClick={() => remove(i)}>
                      <X aria-hidden />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!disabled && value.length > 1 && <p className="mt-2 text-xs text-muted-foreground">{t("reorderHint")}</p>}
        </>
      ) : (
        disabled && <p className="text-sm text-muted-foreground">{t("none")}</p>
      )}
    </div>
  );
}