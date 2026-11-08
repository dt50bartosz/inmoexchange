"use server";

import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { getR2, r2Bucket } from "@/lib/server/r2";
import { getAgencyId } from "@/lib/server/current-agency";
import { requireAdmin } from "@/lib/server/admin/current-admin";
import { requireRole } from "@/lib/server/auth/require-role";
import { fail, ok, type ActionResult } from "@/lib/server/action-result";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { DOCUMENTS_MAX, MAX_DOCUMENT_BYTES } from "@/lib/constants/developers";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_IMAGES_PER_PROPERTY,
  MAX_UPLOAD_BYTES,
  PENDING_PREFIX,
  UPLOAD_URL_TTL_SECONDS,
  DOCUMENT_CONTENT_TYPE,
  adminPendingFolder,
  developerPendingFolder,
  extensionFor,
  type UploadContentType,
} from "@/lib/images/config";

const requestSchema = z
  .array(
    z.object({
      contentType: z.enum(ALLOWED_UPLOAD_TYPES),
      size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
    }),
  )
  .min(1)
  .max(MAX_IMAGES_PER_PROPERTY);

export type UploadTarget = {
  key: string;
  uploadUrl: string;
  contentType: UploadContentType;
};

export type CreateUploadUrlsResult = ActionResult<UploadTarget[], "invalid_files" | "rate_limited" | "server_error">;

/**
 * Issues one short-lived signed URL per photo. Each URL allows exactly one
 * upload, to a server-chosen path in this agency's pending folder, with the
 * declared type and exact byte size.
 * The agency always comes from getAgencyId() on the server, never from the browser.
 */
export async function createUploadUrls(files: unknown): Promise<CreateUploadUrlsResult> {
  const parsed = requestSchema.safeParse(files);
  if (!parsed.success) return fail("invalid_files");

  const agencyId = await getAgencyId();

  // Up to 10 upload batches per minute per agency.
  if (!(await consumeRateLimit(`upload:${agencyId}`, 10, 60))) {
    return fail("rate_limited");
  }
  return signUploads(`${PENDING_PREFIX}/${agencyId}/`, parsed.data);
}

/** The same for a developer login (logo, development photos), into its own pending folder. The account comes from the session. */
export async function createDeveloperUploadUrls(files: unknown): Promise<CreateUploadUrlsResult> {
  const parsed = requestSchema.safeParse(files);
  if (!parsed.success) return fail("invalid_files");
  const { accountId } = await requireRole("developer");
  if (!(await consumeRateLimit(`upload:${accountId}`, 10, 60))) return fail("rate_limited");
  return signUploads(developerPendingFolder(accountId), parsed.data);
}

/** The same for a platform admin (Developer CRM: project images, logos), into the admin's own pending folder. */
export async function createAdminUploadUrls(files: unknown): Promise<CreateUploadUrlsResult> {
  const parsed = requestSchema.safeParse(files);
  if (!parsed.success) return fail("invalid_files");
  const admin = await requireAdmin();
  if (!(await consumeRateLimit(`upload:admin-${admin.id}`, 10, 60))) return fail("rate_limited");
  return signUploads(adminPendingFolder(admin.id), parsed.data);
}

async function signUploads(folder: string, files: z.infer<typeof requestSchema>): Promise<CreateUploadUrlsResult> {
  try {
    const r2 = getR2();
    const Bucket = r2Bucket();

    const targets = await Promise.all(
      files.map(async ({ contentType, size }) => {
        const key = `${folder}${randomUUID()}.${extensionFor(contentType)}`;
        const uploadUrl = await getSignedUrl(
          r2,
          new PutObjectCommand({ Bucket, Key: key, ContentType: contentType, ContentLength: size }),
          {
            expiresIn: UPLOAD_URL_TTL_SECONDS,
            // Bind type and size into the signature so they can't be changed.
            signableHeaders: new Set(["content-type", "content-length"]),
          },
        );
        return { key, uploadUrl, contentType };
      }),
    );

    return ok(targets);
  } catch (error) {
    console.error("createUploadUrls failed", error);
    return fail("server_error");
  }
}

/* ---------- Developments' documents (PDF) ---------- */

const documentRequestSchema = z
  .array(z.object({ contentType: z.literal(DOCUMENT_CONTENT_TYPE), size: z.number().int().positive().max(MAX_DOCUMENT_BYTES) }))
  .min(1)
  .max(DOCUMENTS_MAX);

/** One signed URL per PDF, into the developer's own pending folder. The developer comes from the session. */
export async function createDeveloperDocumentUploadUrls(files: unknown): Promise<CreateDocumentUploadUrlsResult> {
  const parsed = documentRequestSchema.safeParse(files);
  if (!parsed.success) return fail("invalid_files");
  const { accountId } = await requireRole("developer");
  if (!(await consumeRateLimit(`upload:${accountId}`, 10, 60))) return fail("rate_limited");
  return signDocuments(developerPendingFolder(accountId), parsed.data.map((f) => f.size));
}

/** The same for an admin working on a developer's development, into the admin's pending folder. */
export async function createAdminDocumentUploadUrls(files: unknown): Promise<CreateDocumentUploadUrlsResult> {
  const parsed = documentRequestSchema.safeParse(files);
  if (!parsed.success) return fail("invalid_files");
  const admin = await requireAdmin();
  if (!(await consumeRateLimit(`upload:admin-${admin.id}`, 10, 60))) return fail("rate_limited");
  return signDocuments(adminPendingFolder(admin.id), parsed.data.map((f) => f.size));
}

export type DocumentUploadTarget = { key: string; uploadUrl: string };
export type CreateDocumentUploadUrlsResult = ActionResult<DocumentUploadTarget[], "invalid_files" | "rate_limited" | "server_error">;

async function signDocuments(folder: string, sizes: number[]): Promise<CreateDocumentUploadUrlsResult> {
  try {
    const r2 = getR2();
    const Bucket = r2Bucket();
    const targets = await Promise.all(
      sizes.map(async (size) => {
        const key = `${folder}${randomUUID()}.pdf`;
        const uploadUrl = await getSignedUrl(r2, new PutObjectCommand({ Bucket, Key: key, ContentType: DOCUMENT_CONTENT_TYPE, ContentLength: size }), {
          expiresIn: UPLOAD_URL_TTL_SECONDS,
          signableHeaders: new Set(["content-type", "content-length"]),
        });
        return { key, uploadUrl };
      })
    );
    return ok(targets);
  } catch (error) {
    console.error("createDocumentUploadUrls failed", error);
    return fail("server_error");
  }
}
