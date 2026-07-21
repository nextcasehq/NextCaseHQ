import { NextRequest } from 'next/server';
import { POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { putObject, deleteObject } from '@/lib/storage/object-storage';

const TENANT_A = '00000000-0000-4000-8000-000000000f11';
const TENANT_B = '00000000-0000-4000-8000-000000000f12';
const USER_ID = '00000000-0000-4000-8000-000000000f13';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'index-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/documents/placeholder/index'), {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', ...headers },
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const hasS3 = () => Boolean(process.env.S3_ENDPOINT);

describe('POST /api/documents/[id]/index', () => {
  const db = new DatabaseClient();
  const uploadedObjectKeys: string[] = [];

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Index Route Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Index Route Test Tenant B',
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
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, tenantId, 'file.txt', { object_key: objectKey, content_type: 'text/plain' }]
    );
    return documentId;
  }

  test('rejects an invalid (non-UUID) id with 400', async () => {
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('rejects with no session (401)', async () => {
    const res = await POST(buildRequest({}), routeParams(crypto.randomUUID()));
    expect(res.status).toBe(401);
  });

  test('returns 404 for a document belonging to a different tenant', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'private to tenant A');
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader(TENANT_B) }), routeParams(id));
    expect(res.status).toBe(404);
  });

  test('indexes a plain-text document and returns chunksIndexed', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'a real document body about contract law. '.repeat(30));
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('INDEXED');
    expect(body.chunksIndexed).toBeGreaterThan(0);
  });

  test('returns 422 SKIPPED for an unsupported content type', async () => {
    if (!hasS3()) return;
    const documentId = crypto.randomUUID();
    const objectKey = `${TENANT_A}/${documentId}/file.pdf`;
    await putObject(objectKey, Buffer.from('%PDF-1.4 fake'), 'application/pdf');
    uploadedObjectKeys.push(objectKey);
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, TENANT_A, 'file.pdf', { object_key: objectKey, content_type: 'application/pdf' }]
    );
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(documentId));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.reason).toBe('UNSUPPORTED_CONTENT_TYPE');
  });

  test('returns 502 FAILED, honestly, when indexing errors — never a raw 500', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'will be deleted from storage before indexing');
    const envelopeRows = await db.execute<{ storage_structure: { object_key: string } }>(
      TENANT_A,
      `SELECT storage_structure FROM "DocumentEnvelope" WHERE id = $1`,
      [id]
    );
    await deleteObject(envelopeRows[0].storage_structure.object_key);

    const res = await POST(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.status).toBe('FAILED');
    expect(body.error).toBeTruthy();
  });
});
