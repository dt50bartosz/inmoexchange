// Uploads PDFs (developments' documents) straight from the browser to R2 with signed URLs.
// Unlike photos nothing is resized: the file is sent as it is, after a type and size check.
import { DOCUMENT_CONTENT_TYPE } from "@/lib/images/config";
import { MAX_DOCUMENT_BYTES } from "@/lib/constants/developers";
import type { createDeveloperDocumentUploadUrls } from "@/lib/actions/upload";

export type UploadedDocument = { key: string; name: string; size: number };
export type DocumentUploadResult = { uploaded: UploadedDocument[]; rejected: { name: string; reason: "type" | "size" | "failed" }[] };

/** A PDF by its type or, when the browser doesn't say, by its name. */
const isPdf = (f: File) => f.type === DOCUMENT_CONTENT_TYPE || (!f.type && /\.pdf$/i.test(f.name));

export async function uploadDocuments(
  files: File[],
  requestUrls: typeof createDeveloperDocumentUploadUrls
): Promise<DocumentUploadResult> {
  const rejected: DocumentUploadResult["rejected"] = [];
  const ok = files.filter((f) => {
    if (!isPdf(f)) rejected.push({ name: f.name, reason: "type" });
    else if (f.size === 0 || f.size > MAX_DOCUMENT_BYTES) rejected.push({ name: f.name, reason: "size" });
    else return true;
    return false;
  });
  if (!ok.length) return { uploaded: [], rejected };

  const res = await requestUrls(ok.map((f) => ({ contentType: DOCUMENT_CONTENT_TYPE, size: f.size })));
  if (!res.ok) return { uploaded: [], rejected: [...rejected, ...ok.map((f) => ({ name: f.name, reason: "failed" as const }))] };

  // One result per file, in the order the files were picked
  const results = await Promise.all(
    ok.map(async (file, i): Promise<UploadedDocument | null> => {
      try {
        const put = await fetch(res.data[i].uploadUrl, { method: "PUT", headers: { "Content-Type": DOCUMENT_CONTENT_TYPE }, body: file });
        if (!put.ok) throw new Error(String(put.status));
        return { key: res.data[i].key, name: file.name.replace(/\.pdf$/i, ""), size: file.size };
      } catch {
        rejected.push({ name: file.name, reason: "failed" });
        return null;
      }
    })
  );
  const uploaded = results.filter((r): r is UploadedDocument => r !== null);
  return { uploaded, rejected };
}
