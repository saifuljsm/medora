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
