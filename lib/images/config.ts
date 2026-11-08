// Shared image rules — imported by both the browser and the server.

export const MAX_IMAGES_PER_PROPERTY = 30;

/** Largest original photo an agent may pick (before resizing). */
export const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;

/** Largest processed file the browser may upload to R2. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Longest side after resizing, in pixels. */
export const MAX_IMAGE_DIMENSION = 2000;
export const IMAGE_QUALITY = 0.82;

/** The browser always converts to one of these before uploading. */
export const ALLOWED_UPLOAD_TYPES = ["image/webp", "image/jpeg"] as const;
export type UploadContentType = (typeof ALLOWED_UPLOAD_TYPES)[number];

/** What the file picker accepts from the agent. */
export const ACCEPTED_ORIGINAL_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
export const FILE_INPUT_ACCEPT = ".jpg,.jpeg,.png,.webp,.heic,.heif";

/** Signed upload URLs expire after this many seconds. */
export const UPLOAD_URL_TTL_SECONDS = 300;

/** Uploads land here until the property is saved. Clean up with an R2 lifecycle rule. */
export const PENDING_PREFIX = "pending";
export const PROPERTIES_PREFIX = "properties";
export const LOGOS_PREFIX = "logos";
/** Development project images: projects/<developerId>/<projectId>/… */
export const PROJECTS_PREFIX = "projects";
/** Admin uploads (project images, logos) wait here until saved. */
export const adminPendingFolder = (adminId: string) => `${PENDING_PREFIX}/admin-${adminId}/`;
/** Developer uploads (logo, development photos) wait here until saved. */
export const developerPendingFolder = (developerId: string) => `${PENDING_PREFIX}/${developerId}/`;

export function extensionFor(contentType: UploadContentType): "webp" | "jpg" {
  return contentType === "image/webp" ? "webp" : "jpg";
}

/** Developments' documents (brochure, price list, plans…) are uploaded as PDF only. */
export const DOCUMENT_CONTENT_TYPE = "application/pdf";
