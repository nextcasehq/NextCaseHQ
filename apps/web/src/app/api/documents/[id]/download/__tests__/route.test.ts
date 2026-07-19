import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { putObject, deleteObject } from '@/lib/storage/object-storage';

const TENANT_A = '00000000-0000-4000-8000-0000000000e5';
const TENANT_B = '00000000-0000-4000-8000-0000000000e6';
const USER_ID = '00000000-0000-4000-8000-00000000009f';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'download-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/documents/placeholder/download'), { headers });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const hasS3 = () => Boolean(process.env.S3_ENDPOINT);

describe('GET /api/documents/[id]/download', () => {
  const db = new DatabaseClient();
  const uploadedObjectKeys: string[] = [];

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Download Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Download Test Tenant B',
    ]);
    // DocumentAccessEvent.user_id references "User"(id) — the session's
    // `sub` claim must resolve to a real row for the audit insert to
    // actually succeed rather than fail open.
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'download-test@nextcase.local']
    );
  });

  afterAll(async () => {
    await Promise.all(uploadedObjectKeys.map((key) => deleteObject(key).catch(() => {})));
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  async function createDocumentWithRealObject(tenantId: string, content: string): Promise<string> {
    const documentId = crypto.randomUUID();
    const objectKey = `${tenantId}/${documentId}/file.txt`;
    await putObject(objectKey, Buffer.from(content), 'text/plain');
    uploadedObjectKeys.push(objectKey);

    await db.execute(
      tenantId,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure)
       VALUES ($1, $2, $3, $4)`,
      [documentId, tenantId, 'file.txt', { object_key: objectKey, content_type: 'text/plain' }]
    );
    return documentId;
  }

  test('rejects an invalid (non-UUID) id with 400', async () => {
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('rejects with no session (401)', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'hello');
    const res = await GET(buildRequest({}), routeParams(id));
    expect(res.status).toBe(401);
  });

  test('returns the real stored bytes for the owning tenant', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'the real file content');
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain');
    const bodyText = await res.text();
    expect(bodyText).toBe('the real file content');
  });

  test('returns 404 for a document belonging to a different tenant — storage is never even touched', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'private to tenant A');
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_B) }), routeParams(id));
    expect(res.status).toBe(404);
  });

  test('returns 404 for a document metadata row with no object_key (pre-storage-integration record)', async () => {
    if (!hasS3()) return;
    const documentId = crypto.randomUUID();
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, TENANT_A, 'legacy.txt', { storage_provider: 'pending' }]
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(documentId));
    expect(res.status).toBe(404);
  });

  test('returns a deterministic 404 DOCUMENT_OBJECT_MISSING when the object is gone from storage — never a raw 500', async () => {
    if (!hasS3()) return;
    const documentId = crypto.randomUUID();
    const objectKey = `${TENANT_A}/${documentId}/deleted-before-download.txt`;
    await putObject(objectKey, Buffer.from('will be deleted'), 'text/plain');
    await deleteObject(objectKey);
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, TENANT_A, 'deleted-before-download.txt', { object_key: objectKey, content_type: 'text/plain' }]
    );

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(documentId));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('DOCUMENT_OBJECT_MISSING');
  });

  test('records a durable DOWNLOAD audit event on a real download, with a correlation id when supplied', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'audited download content');
    const res = await GET(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A), 'x-request-id': 'corr-download-1' }),
      routeParams(id)
    );
    expect(res.status).toBe(200);

    const rows = await db.execute<{ action: string; user_id: string; correlation_id: string; version_number: number | null }>(
      TENANT_A,
      `SELECT action, user_id, correlation_id, version_number FROM "DocumentAccessEvent" WHERE envelope_id = $1`,
      [id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('DOWNLOAD');
    expect(rows[0].user_id).toBe(USER_ID);
    expect(rows[0].correlation_id).toBe('corr-download-1');
  });
});
