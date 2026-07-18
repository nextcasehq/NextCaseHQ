#!/usr/bin/env node
/**
 * Starts a real, local S3-API-compatible server (s3rver) for tests —
 * MinIO is not runnable in every environment this project's tests run in
 * (no Docker / blocked binary download in some sandboxes), but s3rver is a
 * pure-Node package that speaks the same real S3 HTTP API, so
 * apps/web/src/lib/storage/object-storage.ts (a standard
 * @aws-sdk/client-s3 client) is tested against a genuine S3-compatible
 * server either way — this script never substitutes a mock/stub.
 *
 * Same pattern as starting a local postgres/redis for tests: run this in
 * the background, then run tests with S3_* env vars pointed at it.
 *
 * Usage: node scripts/test/start-s3rver.js
 */
const path = require('path');
const fs = require('fs');
const S3rver = require('s3rver');
const { S3Client, CreateBucketCommand } = require('@aws-sdk/client-s3');

const PORT = Number(process.env.S3_TEST_PORT) || 4569;
const BUCKET = process.env.S3_TEST_BUCKET || 'nextcase-documents-test';
const dataDir = path.join(__dirname, '..', '..', '.s3rver-data');

fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });

const server = new S3rver({
  port: PORT,
  address: '0.0.0.0',
  silent: true,
  directory: dataDir,
});

server
  .run()
  .then(async () => {
    const client = new S3Client({
      endpoint: `http://127.0.0.1:${PORT}`,
      region: 'us-east-1',
      credentials: { accessKeyId: 'S3RVER', secretAccessKey: 'S3RVER' },
      forcePathStyle: true,
    });
    await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
    console.log(`[s3rver] listening on port ${PORT}, bucket '${BUCKET}' ready`);
  })
  .catch((err) => {
    console.error('[s3rver] failed to start:', err);
    process.exit(1);
  });
