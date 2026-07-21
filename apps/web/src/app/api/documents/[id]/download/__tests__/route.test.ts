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

  test('serves the CURRENT version after a second version is uploaded — never stale v1 content', async () => {
    if (!hasS3()) return;
    const documentId = crypto.randomUUID();
    const v1Key = `${TENANT_A}/${documentId}/v1/versioned.txt`;
    const v2Key = `${TENANT_A}/${documentId}/v2/versioned.txt`;
    await putObject(v1Key, Buffer.from('version one content'), 'text/plain');
    await putObject(v2Key, Buffer.from('version TWO content, newer'), 'text/plain');
    uploadedObjectKeys.push(v1Key, v2Key);

    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, TENANT_A, 'versioned.txt', { object_key: v1Key, content_type: 'text/plain' }]
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentVersion" (tenant_id, document_id, version_number, object_key, content_type, size_bytes)
       VALUES ($1, $2, 1, $3, $4, $5)`,
      [TENANT_A, documentId, v1Key, 'text/plain', 20]
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentVersion" (tenant_id, document_id, version_number, object_key, content_type, size_bytes)
       VALUES ($1, $2, 2, $3, $4, $5)`,
      [TENANT_A, documentId, v2Key, 'text/plain', 27]
    );

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(documentId));
    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).toBe('version TWO content, newer');
  });

  test('falls back to the legacy storage_structure object_key for a row with no DocumentVersion at all', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'pre-versioning fallback content');
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).toBe('pre-versioning fallback content');
  });
});
