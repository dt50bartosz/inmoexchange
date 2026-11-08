import "server-only";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getR2, r2Bucket } from "@/lib/server/r2";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  DOCUMENT_CONTENT_TYPE,
  type UploadContentType,
} from "@/lib/images/config";
import { MAX_DOCUMENT_BYTES } from "@/lib/constants/developers";

export type InspectedUpload =
  | { ok: true; contentType: UploadContentType; size: number }
  | { ok: false; reason: "missing" | "too_large" | "bad_type" };

/**
 * Checks an uploaded file on the server: it must exist, be within the size
 * limit, and really be a JPEG/WebP (checked by its first bytes, not its name).
 */
export async function inspectUpload(key: string): Promise<InspectedUpload> {
  const r2 = getR2();
  const Bucket = r2Bucket();

  let size: number;
  let contentType: string | undefined;
  try {
    const head = await r2.send(new HeadObjectCommand({ Bucket, Key: key }));
    size = head.ContentLength ?? 0;
    contentType = head.ContentType;
  } catch {
    return { ok: false, reason: "missing" };
  }

  if (size <= 0 || size > MAX_UPLOAD_BYTES) return { ok: false, reason: "too_large" };
  if (!ALLOWED_UPLOAD_TYPES.includes(contentType as UploadContentType)) {
    return { ok: false, reason: "bad_type" };
  }

  const start = await r2.send(new GetObjectCommand({ Bucket, Key: key, Range: "bytes=0-15" }));
  const bytes = await start.Body?.transformToByteArray();
  if (!bytes || !matchesSignature(bytes, contentType as UploadContentType)) {
    return { ok: false, reason: "bad_type" };
  }

  return { ok: true, contentType: contentType as UploadContentType, size };
}

function matchesSignature(b: Uint8Array, type: UploadContentType): boolean {
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
}

export type InspectedDocument = { ok: true; size: number } | { ok: false; reason: "missing" | "too_large" | "bad_type" };

/** The same check for an uploaded PDF (developments' documents): it must exist, fit the limit and start with "%PDF-". */
export async function inspectDocument(key: string): Promise<InspectedDocument> {
  const r2 = getR2();
  const Bucket = r2Bucket();
  let size: number;
  let contentType: string | undefined;
  try {
    const head = await r2.send(new HeadObjectCommand({ Bucket, Key: key }));
    size = head.ContentLength ?? 0;
    contentType = head.ContentType;
  } catch {
    return { ok: false, reason: "missing" };
  }
  if (size <= 0 || size > MAX_DOCUMENT_BYTES) return { ok: false, reason: "too_large" };
  if (contentType !== DOCUMENT_CONTENT_TYPE) return { ok: false, reason: "bad_type" };
  const start = await r2.send(new GetObjectCommand({ Bucket, Key: key, Range: "bytes=0-4" }));
  const bytes = await start.Body?.transformToByteArray();
  if (!bytes || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") return { ok: false, reason: "bad_type" };
  return { ok: true, size };
}

/** Moves a file inside the bucket (copy, then delete the original). */
export async function moveObject(from: string, to: string, contentType: UploadContentType | typeof DOCUMENT_CONTENT_TYPE) {
  const r2 = getR2();
  const Bucket = r2Bucket();
  await r2.send(
    new CopyObjectCommand({
      Bucket,
      CopySource: `${Bucket}/${from}`,
      Key: to,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
      MetadataDirective: "REPLACE",
    }),
  );
  await deleteKeys([from]);
}

/** Deletes keys, a few at a time. Missing keys are ignored. */
export async function deleteKeys(keys: string[]) {
  const r2 = getR2();
  const Bucket = r2Bucket();
  for (let i = 0; i < keys.length; i += 10) {
    await Promise.all(
      keys.slice(i, i + 10).map((Key) => r2.send(new DeleteObjectCommand({ Bucket, Key }))),
    );
  }
}

/** Deletes everything under a folder, e.g. all photos of one property. */
export async function deletePrefix(prefix: string) {
  const r2 = getR2();
  const Bucket = r2Bucket();
  let ContinuationToken: string | undefined;

  do {
    const page = await r2.send(
      new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken }),
    );
    const keys = (page.Contents ?? []).flatMap((o) => (o.Key ? [o.Key] : []));
    await deleteKeys(keys);
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);
}
