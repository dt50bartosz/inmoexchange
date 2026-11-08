// Browser-only: resizes an image and uploads it to the blog folder in R2. Returns its public URL.
import { prepareImage } from "@/lib/images/prepare-image";
import { createBlogImageUploadAction } from "@/app/[locale]/admin/blog/server/actions";

export async function uploadBlogImage(file: File): Promise<string> {
  const img = await prepareImage(file); // throws ImageValidationError for non-images and huge files
  const res = await createBlogImageUploadAction({ contentType: img.contentType, size: img.blob.size });
  if (!res.ok) throw new Error(res.error);
  const put = await fetch(res.data.uploadUrl, { method: "PUT", headers: { "Content-Type": img.contentType }, body: img.blob });
  if (!put.ok) throw new Error("upload_failed");
  return res.data.url;
}
