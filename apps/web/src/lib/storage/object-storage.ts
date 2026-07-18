import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Provider-agnostic object storage adapter. Speaks the standard S3 HTTP
 * API via @aws-sdk/client-s3 against whatever S3-compatible endpoint
 * S3_ENDPOINT points at — real AWS S3, MinIO, Supabase Storage's
 * S3-compatible endpoint, Cloudflare R2, or (for local dev/test) s3rver.
 * Nothing here is vendor-specific; switching providers is purely an env
 * var change, never a code change.
 *
 * Lazy singleton, same pattern as lib/security/redis-client.ts. Returns
 * null when unconfigured so callers can surface a clear
 * "not configured" error rather than silently no-op'ing.
 */

interface ObjectStorageConfig {
  client: S3Client;
  bucket: string;
}

let config: ObjectStorageConfig | null | undefined;

function getConfig(): ObjectStorageConfig | null {
  if (config !== undefined) {
    return config;
  }

  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    config = null;
    return null;
  }

  const client = new S3Client({
    endpoint,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    // Path-style (http://host/bucket/key) is what MinIO, s3rver, and most
    // self-hosted S3-compatible services expect; real AWS S3 supports it
    // too, so this is a safe default rather than a vendor-specific one.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  });

  config = { client, bucket };
  return config;
}

export function isObjectStorageConfigured(): boolean {
  return getConfig() !== null;
}

export interface PutObjectResult {
  etag: string | undefined;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<PutObjectResult> {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error('OBJECT_STORAGE_NOT_CONFIGURED');
  }
  const result = await cfg.client.send(
    new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentType })
  );
  return { etag: result.ETag };
}

export interface GetObjectResult {
  buffer: Buffer;
  contentType?: string;
  contentLength?: number;
}

export async function getObject(key: string): Promise<GetObjectResult> {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error('OBJECT_STORAGE_NOT_CONFIGURED');
  }
  const result = await cfg.client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
  const bytes = await result.Body!.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    contentType: result.ContentType,
    contentLength: result.ContentLength,
  };
}

export async function deleteObject(key: string): Promise<void> {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error('OBJECT_STORAGE_NOT_CONFIGURED');
  }
  await cfg.client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

/** Test-only: force re-evaluation of S3_* env vars / a fresh client instance. */
export function __resetObjectStorageConfigForTests(): void {
  config = undefined;
}
