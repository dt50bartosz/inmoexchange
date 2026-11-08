// Browser-only: resizes, converts HEIC, strips EXIF/GPS and re-encodes a photo
// before upload. Import only from client components.

import {
  ACCEPTED_ORIGINAL_TYPES,
  IMAGE_QUALITY,
  MAX_IMAGE_DIMENSION,
  MAX_ORIGINAL_BYTES,
  MAX_UPLOAD_BYTES,
  type UploadContentType,
} from "@/lib/images/config";

export type ImageErrorCode = "unsupported_type" | "too_large" | "unreadable";

export class ImageValidationError extends Error {
  constructor(
    public code: ImageErrorCode,
    public fileName: string,
  ) {
    super(code);
  }
}

export type PreparedImage = {
  blob: Blob;
  contentType: UploadContentType;
  width: number;
  height: number;
  fileName: string;
};

const HEIC_NAME = /\.(heic|heif)$/i;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const isHeic = file.type === "image/heic" || file.type === "image/heif" || HEIC_NAME.test(file.name);

  if (!isHeic && !ACCEPTED_ORIGINAL_TYPES.includes(file.type)) {
    throw new ImageValidationError("unsupported_type", file.name);
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new ImageValidationError("too_large", file.name);
  }

  // iPhone photos: convert HEIC to JPEG first (library loaded only when needed).
  let source: Blob = file;
  if (isHeic) {
    try {
      const { default: heic2any } = await import("heic2any");
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
      source = Array.isArray(converted) ? converted[0] : converted;
    } catch {
      throw new ImageValidationError("unreadable", file.name);
    }
  }

  let bitmap: ImageBitmap;
  try {
    // Applies the camera's rotation so photos aren't sideways.
    bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    throw new ImageValidationError("unreadable", file.name);
  }

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  // Drawing to a canvas and re-encoding drops all metadata (EXIF, GPS).
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageValidationError("unreadable", file.name);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Prefer WebP; fall back to JPEG on browsers that can't encode WebP.
  let blob = await toBlob(canvas, "image/webp", IMAGE_QUALITY);
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob(canvas, "image/jpeg", IMAGE_QUALITY);
  }
  if (blob && blob.size > MAX_UPLOAD_BYTES) {
    blob = await toBlob(canvas, blob.type, 0.6);
  }

  canvas.width = 0; // free memory
  canvas.height = 0;

  if (!blob) throw new ImageValidationError("unreadable", file.name);
  if (blob.size > MAX_UPLOAD_BYTES) throw new ImageValidationError("too_large", file.name);

  return {
    blob,
    contentType: blob.type as UploadContentType,
    width,
    height,
    fileName: file.name,
  };
}
