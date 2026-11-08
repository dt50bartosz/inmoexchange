"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { FILE_INPUT_ACCEPT } from "@/lib/images/config";
import { PROJECT_IMAGES_MAX } from "@/lib/constants/developers";
import { uploadImages } from "@/lib/images/upload-images";
import type { createUploadUrls } from "@/lib/actions/upload";
import type { StoredImage } from "@/types/developers";

type Props = {
  images: StoredImage[];
  mainImageId: string | null;
  onChange: (images: StoredImage[], mainImageId: string | null) => void;
  /** The admin passes createAdminUploadUrls; the panel uses the agency's default. */
  requestUrls?: typeof createUploadUrls;
};

/**
 * Project images: upload (resized in the browser, straight to storage), remove, pick the main one.
 * New images keep their pending key as id until the project is saved; the server moves them.
 */
export default function ProjectImagesField({ images, mainImageId, onChange, requestUrls }: Props) {
  const t = useTranslations("Projects.images");
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const main = mainImageId ?? images[0]?.id ?? null;

  const add = async (files: File[]) => {
    const room = PROJECT_IMAGES_MAX - images.length;
    if (room <= 0) return toast.error(t("tooMany", { max: PROJECT_IMAGES_MAX }));
    if (files.length > room) toast.warning(t("tooMany", { max: PROJECT_IMAGES_MAX }));
    try {
      const { uploaded, rejected } = await uploadImages(files.slice(0, room), { requestUrls, onProgress: (done, total) => setProgress({ done, total }) });
      if (rejected.length) toast.warning(t("rejected", { count: rejected.length }));
      const added = uploaded.map((u) => ({ id: u.key, key: u.key, url: u.previewUrl, width: u.width, height: u.height }));
      onChange([...images, ...added], mainImageId);
    } catch {
      toast.error(t("failed"));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  };

  const remove = (id: string) => {
    const next = images.filter((i) => i.id !== id);
    onChange(next, mainImageId === id ? null : mainImageId);
  };

  return (
    <div>
      {images.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => {
            const isMain = img.id === main;
            return (
              <li key={img.id} className={`group relative overflow-hidden rounded-lg border bg-muted ${isMain ? "ring-2 ring-primary" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="aspect-[4/3] w-full object-cover" />
                {isMain && (
                  <span className="absolute top-2 left-2 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">{t("main")}</span>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {!isMain && (
                    <button type="button" onClick={() => onChange(images, img.id)} className="rounded bg-background/90 p-1 shadow-sm hover:bg-background" aria-label={t("makeMain")} title={t("makeMain")}>
                      <Star aria-hidden className="size-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => remove(img.id)} className="rounded bg-background/90 p-1 shadow-sm hover:bg-background" aria-label={t("remove")} title={t("remove")}>
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <input ref={input} type="file" accept={FILE_INPUT_ACCEPT} multiple hidden onChange={(e) => add([...(e.target.files ?? [])])} />
      <Button type="button" variant="outline" disabled={!!progress || images.length >= PROJECT_IMAGES_MAX} onClick={() => input.current?.click()}>
        <ImagePlus aria-hidden className="size-4" />
        {progress ? t("uploading", progress) : t("add")}
      </Button>
    </div>
  );
}
