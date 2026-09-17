import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

/**
 * Cloudflare R2 presigned uploads via the S3-compatible API — the AWS S3
 * SDK pointed at R2's endpoint (https://<account>.r2.cloudflarestorage.com),
 * not AWS S3 itself. Used for product images (staff, Phase 2.1/2.2) and
 * prescription photos (staff at POS today; customer-facing upload in
 * Phase 2.11 once customer auth exists).
 */

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY (see .env.example).",
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const MAX_PRESIGN_TTL_SECONDS = 300;

export type UploadPurpose = "product-image" | "prescription-photo";

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export async function createPresignedUpload(params: {
  purpose: UploadPurpose;
  filename: string;
  contentType: string;
}): Promise<PresignedUpload> {
  if (!ALLOWED_CONTENT_TYPES.includes(params.contentType)) {
    throw new Error(`Unsupported content type: ${params.contentType}`);
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const publicBase = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicBase) {
    throw new Error("R2 is not configured — set R2_BUCKET_NAME and R2_PUBLIC_URL (see .env.example).");
  }

  const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${params.purpose}/${randomUUID()}-${safeName}`;

  const client = getR2Client();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: params.contentType });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: MAX_PRESIGN_TTL_SECONDS });

  return { uploadUrl, publicUrl: `${publicBase.replace(/\/$/, "")}/${key}`, key };
}

const MAX_FETCHED_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB

/**
 * A Dropbox share link (dropbox.com/s/...?dl=0) serves an HTML preview
 * page, not the file itself — dl=1 forces the raw bytes. Left as-is for
 * any other host (already-direct URLs, other providers).
 */
function normalizeSourceUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  if (url.hostname === "www.dropbox.com" || url.hostname === "dropbox.com") {
    url.searchParams.set("dl", "1");
  }
  return url.toString();
}

/**
 * Fetches an image from an arbitrary URL (e.g. a Dropbox share link) and
 * re-uploads it to R2 server-side — used by bulk product import so a
 * pharmacist can put an image URL in a spreadsheet column instead of using
 * the browser upload UI per product.
 */
export async function uploadImageFromUrl(params: { sourceUrl: string; purpose: UploadPurpose }): Promise<PresignedUpload> {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBase = process.env.R2_PUBLIC_URL;
  if (!bucket || !publicBase) {
    throw new Error("R2 is not configured — set R2_BUCKET_NAME and R2_PUBLIC_URL (see .env.example).");
  }

  const fetchUrl = normalizeSourceUrl(params.sourceUrl);
  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Could not download image from ${params.sourceUrl} (HTTP ${response.status})`);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error(`URL did not return a supported image type (got "${contentType || "unknown"}"): ${params.sourceUrl}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FETCHED_IMAGE_BYTES) {
    throw new Error(`Image at ${params.sourceUrl} is too large (max 15MB)`);
  }

  const body = Buffer.from(await response.arrayBuffer());
  if (body.byteLength > MAX_FETCHED_IMAGE_BYTES) {
    throw new Error(`Image at ${params.sourceUrl} is too large (max 15MB)`);
  }

  const extension = contentType.split("/")[1] ?? "jpg";
  const key = `${params.purpose}/${randomUUID()}.${extension}`;

  const client = getR2Client();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));

  return { uploadUrl: "", publicUrl: `${publicBase.replace(/\/$/, "")}/${key}`, key };
}
