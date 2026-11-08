// Browser-only: prepares photos and uploads them straight to R2 using
// signed URLs from the server. Import only from client components.

import { createUploadUrls } from "@/lib/actions/upload";
import {
  ImageValidationError,
  prepareImage,
  type PreparedImage,
} from "@/lib/images/prepare-image";

export class UploadError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export type UploadedImage = {
  /** Storage key in the pending folder; the server moves it on save. */
  key: string;
  width: number;
  height: number;
  /** Local preview; call URL.revokeObjectURL when the photo is removed. */
  previewUrl: string;
};

export type UploadResult = {
  uploaded: UploadedImage[];
  /** Files that weren't images, were too large, or couldn't be read. */
  rejected: { file: File; code: ImageValidationError["code"] }[];
};

type Options = {
  onProgress?: (done: number, total: number) => void;
  concurrency?: number;
  /** Where the signed upload URLs come from: the agency's (default) or the admin's (createAdminUploadUrls). */
  requestUrls?: typeof createUploadUrls;
};

/**
 * Skips invalid files (returned in `rejected`).
 * Throws UploadError if the server or network fails.
 * The agency is decided on the server, so it isn't passed in.
 */
export async function uploadImages(files: File[], options: Options = {}): Promise<UploadResult> {
  const { onProgress, concurrency = 3, requestUrls = createUploadUrls } = options;

  // Prepare one at a time to keep memory low on phones.
  const prepared: PreparedImage[] = [];
  const rejected: UploadResult["rejected"] = [];
  for (const file of files) {
    try {
      prepared.push(await prepareImage(file));
    } catch (error) {
      if (error instanceof ImageValidationError) rejected.push({ file, code: error.code });
      else rejected.push({ file, code: "unreadable" });
    }
  }
  if (prepared.length === 0) return { uploaded: [], rejected };

  const res = await requestUrls(prepared.map((p) => ({ contentType: p.contentType, size: p.blob.size })));
  if (!res.ok) throw new UploadError(res.error);
  const targets = res.data;

  let done = 0;
  onProgress?.(0, prepared.length);

  let next = 0;
  const worker = async () => {
    while (next < prepared.length) {
      const i = next++;
      const target = targets[i];
      const response = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": target.contentType },
        body: prepared[i].blob,
      });
      if (!response.ok) throw new UploadError("upload_failed");
      onProgress?.(++done, prepared.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, prepared.length) }, worker));

  const uploaded = prepared.map((p, i) => ({
    key: targets[i].key,
    width: p.width,
    height: p.height,
    previewUrl: URL.createObjectURL(p.blob),
  }));
  return { uploaded, rejected };
}