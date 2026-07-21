import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { putObject, deleteObject, __resetObjectStorageConfigForTests } from '@/lib/storage/object-storage';

const TENANT_A = '00000000-0000-4000-8000-000000000904';
const TENANT_B = '00000000-0000-4000-8000-000000000905';
const USER_ID = '00000000-0000-4000-8000-000000000906';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'preview-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/documents/placeholder/preview'), { headers });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const hasS3 = () => Boolean(process.env.S3_ENDPOINT);

describe('GET /api/documents/[id]/preview', () => {
  const db = new DatabaseClient();
  const uploadedObjectKeys: string[] = [];

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Preview Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Preview Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'preview-test@nextcase.local']
    );
  });

  afterAll(async () => {
    await Promise.all(uploadedObjectKeys.map((key) => deleteObject(key).catch(() => {})));
    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  async function createDocumentWithRealObject(
    tenantId: string,
    content: string,
    contentType: string,
    fileName = 'file'
  ): Promise<string> {
    const documentId = crypto.randomUUID();
    const objectKey = `${tenantId}/${documentId}/${fileName}`;
    await putObject(objectKey, Buffer.from(content), contentType);
    uploadedObjectKeys.push(objectKey);

    await db.execute(
      tenantId,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, tenantId, fileName, { object_key: objectKey, content_type: contentType }]
    );
    await db.execute(
      tenantId,
      `INSERT INTO "DocumentVersion" (tenant_id, envelope_id, version_number, title, storage_structure)
       VALUES ($1, $2, 1, $3, $4)`,
      [tenantId, documentId, fileName, { object_key: objectKey, content_type: contentType }]
    );
    return documentId;
  }

  test('rejects an invalid (non-UUID) id with 400', async () => {
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('rejects with no session (401)', async () => {
    const res = await GET(buildRequest({}), routeParams(crypto.randomUUID()));
    expect(res.status).toBe(401);
  });

  test('returns 404 for a document belonging to a different tenant — storage is never even touched', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'private to tenant A', 'text/plain');
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_B) }), routeParams(id));
    expect(res.status).toBe(404);
  });

  test('returns 404 for a well-formed but non-existent id', async () => {
    const res = await GET(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }),
      routeParams(NON_EXISTENT_ID)
    );
    expect(res.status).toBe(404);
  });

  test('returns 404 for a document metadata row with no object_key', async () => {
    const documentId = crypto.randomUUID();
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, TENANT_A, 'legacy.txt', { storage_provider: 'pending' }]
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(documentId));
    expect(res.status).toBe(404);
  });

  test('previews a text/plain document inline, with the right headers', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'the plain text preview body', 'text/plain', 'notes.txt');
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/plain');
    expect(res.headers.get('content-disposition')).toContain('inline');
    expect(res.headers.get('cache-control')).toBe('private, max-age=300');
    const body = await res.text();
    expect(body).toBe('the plain text preview body');
  });

  test('previews a PNG image inline', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'fake-png-bytes', 'image/png', 'exhibit.png');
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('content-disposition')).toContain('inline');
  });

  test('previews a PDF inline', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, '%PDF-1.4 fake', 'application/pdf', 'contract.pdf');
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toContain('inline');
  });

  test('returns an explicit, testable 415 for DOC — download-only, never a silent failure', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'fake doc bytes', 'application/msword', 'brief.doc');
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.code).toBe('PREVIEW_UNSUPPORTED_FILE_TYPE');
  });

  test('returns an explicit, testable 415 for DOCX — download-only, never a silent failure', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(
      TENANT_A,
      'fake docx bytes',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'brief.docx'
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.code).toBe('PREVIEW_UNSUPPORTED_FILE_TYPE');
  });

  test('returns a deterministic 404 DOCUMENT_OBJECT_MISSING when the object is gone from storage — never a raw 500', async () => {
    if (!hasS3()) return;
    const documentId = crypto.randomUUID();
    const objectKey = `${TENANT_A}/${documentId}/deleted-before-preview.txt`;
    await putObject(objectKey, Buffer.from('will be deleted'), 'text/plain');
    await deleteObject(objectKey);
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, TENANT_A, 'deleted-before-preview.txt', { object_key: objectKey, content_type: 'text/plain' }]
    );

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(documentId));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('DOCUMENT_OBJECT_MISSING');
  });

  test('returns 503 when object storage is not configured', async () => {
    const original = process.env.S3_ENDPOINT;
    delete process.env.S3_ENDPOINT;
    __resetObjectStorageConfigForTests();

    const documentId = crypto.randomUUID();
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, TENANT_A, 'notes.txt', { object_key: `${TENANT_A}/${documentId}/notes.txt`, content_type: 'text/plain' }]
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(documentId));
    expect(res.status).toBe(503);

    if (original !== undefined) process.env.S3_ENDPOINT = original;
    __resetObjectStorageConfigForTests();
  });

  test('records a durable PREVIEW audit event with the current version, and a correlation id when supplied', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'audited preview content', 'text/plain', 'audited.txt');
    const res = await GET(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A), 'x-request-id': 'corr-preview-1' }),
      routeParams(id)
    );
    expect(res.status).toBe(200);

    const rows = await db.execute<{
      action: string;
      user_id: string;
      version_number: number;
      correlation_id: string;
    }>(
      TENANT_A,
      `SELECT action, user_id, version_number, correlation_id FROM "DocumentAccessEvent" WHERE envelope_id = $1`,
      [id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('PREVIEW');
    expect(rows[0].user_id).toBe(USER_ID);
    expect(rows[0].version_number).toBe(1);
    expect(rows[0].correlation_id).toBe('corr-preview-1');
  });

  test('does not record an audit event for an unsupported-type preview attempt', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'fake doc bytes', 'application/msword', 'no-audit.doc');
    await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));

    const rows = await db.execute(TENANT_A, `SELECT id FROM "DocumentAccessEvent" WHERE envelope_id = $1`, [id]);
    expect(rows).toHaveLength(0);
  });
});
