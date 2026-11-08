import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

let client: S3Client | undefined;

/** S3-compatible client for Cloudflare R2. Keys stay on the server. */
export function getR2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
      // Newer AWS SDKs add checksum params to signed URLs by default,
      // which makes browser uploads to R2 fail. Only send them when required.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

export function r2Bucket(): string {
  return required("R2_BUCKET");
}

/** Public URL for a stored key (custom domain or r2.dev URL of the bucket). */
export function publicImageUrl(key: string): string {
  return `${required("R2_PUBLIC_URL").replace(/\/$/, "")}/${key}`;
}
