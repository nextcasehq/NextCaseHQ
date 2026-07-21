import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { deleteObject } from '@/lib/storage/object-storage';

const TENANT_A = '00000000-0000-4000-8000-0000000000c1';
const TENANT_B = '00000000-0000-4000-8000-0000000000c2';
const USER_ID = '00000000-0000-4000-8000-0000000000c3';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'versions-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: string): NextRequest {
  return new NextRequest(new URL('http://localhost/api/documents/placeholder/versions'), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const hasS3 = () => Boolean(process.env.S3_ENDPOINT);

describe('GET/POST /api/documents/[id]/versions', () => {
  const db = new DatabaseClient();
  const uploadedObjectKeys: string[] = [];

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Versions Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Versions Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email, name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'versions-test@nextcase.local', 'Versions Test User']
    );
  });

  afterAll(async () => {
    await Promise.all(uploadedObjectKeys.map((key) => deleteObject(key).catch(() => {})));
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  async function createDocumentWithFirstVersion(tenantId: string, title: string): Promise<string> {
    const docRows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, title]
    );
    const objectKey = `${tenantId}/${docRows[0].id}/v1/${title}`;
    await db.execute(
      tenantId,
      `INSERT INTO "DocumentVersion" (tenant_id, document_id, version_number, object_key, content_type, size_bytes)
       VALUES ($1, $2, 1, $3, $4, $5)`,
      [tenantId, docRows[0].id, objectKey, 'text/plain', 10]
    );
    return docRows[0].id;
  }

  test('GET rejects an invalid (non-UUID) id with 400', async () => {
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('GET rejects with no session (401)', async () => {
    const id = await createDocumentWithFirstVersion(TENANT_A, 'needs-auth.txt');
    const res = await GET(buildRequest('GET', {}), routeParams(id));
    expect(res.status).toBe(401);
  });

  test('GET returns 404 for a document belonging to a different tenant', async () => {
    const id = await createDocumentWithFirstVersion(TENANT_A, 'tenant-a-only.txt');
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_B) }), routeParams(id));
    expect(res.status).toBe(404);
  });

  test('GET lists version history for the owning tenant, newest first', async () => {
    const id = await createDocumentWithFirstVersion(TENANT_A, 'history.txt');
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.versions).toHaveLength(1);
    expect(body.versions[0].version_number).toBe(1);
  });

  test('POST rejects an untrusted origin (403)', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithFirstVersion(TENANT_A, 'origin-test.txt');
    const res = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example', 'x-file-name': 'v2.txt' },
        'v2 bytes'
      ),
      routeParams(id)
    );
    expect(res.status).toBe(403);
  });

  test('POST rejects with no session (401)', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithFirstVersion(TENANT_A, 'auth-test.txt');
    const res = await POST(buildRequest('POST', { 'x-file-name': 'v2.txt' }, 'v2 bytes'), routeParams(id));
    expect(res.status).toBe(401);
  });

  test('POST returns 404 for a document belonging to a different tenant, before touching storage', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithFirstVersion(TENANT_A, 'cross-tenant.txt');
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_B), 'x-file-name': 'v2.txt' }, 'v2 bytes'),
      routeParams(id)
    );
    expect(res.status).toBe(404);
  });

  test('POST requires x-file-name (400)', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithFirstVersion(TENANT_A, 'needs-filename.txt');
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, 'bytes'), routeParams(id));
    expect(res.status).toBe(400);
  });

  test('POST creates version 2 without touching or deleting version 1s object', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithFirstVersion(TENANT_A, 'multi-version.txt');

    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A), 'x-file-name': 'multi-version-v2.txt' }, 'version 2 content'),
      routeParams(id)
    );
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.version_number).toBe(2);
    expect(body.document_id).toBe(id);

    const versions = await db.execute<{ version_number: number; object_key: string }>(
      TENANT_A,
      `SELECT version_number, object_key FROM "DocumentVersion" WHERE document_id = $1 ORDER BY version_number ASC`,
      [id]
    );
    expect(versions).toHaveLength(2);
    expect(versions[0].version_number).toBe(1);
    expect(versions[1].version_number).toBe(2);
    expect(versions[0].object_key).not.toBe(versions[1].object_key);
    uploadedObjectKeys.push(versions[1].object_key);

    const listRes = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    const listBody = await listRes.json();
    expect(listBody.versions).toHaveLength(2);
    expect(listBody.versions[0].version_number).toBe(2); // newest first
  });

  test('a third version continues incrementing correctly (not reset, not duplicated)', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithFirstVersion(TENANT_A, 'triple-version.txt');
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A), 'x-file-name': 'triple-v2.txt' }, 'v2'),
      routeParams(id)
    );
    const res3 = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A), 'x-file-name': 'triple-v3.txt' }, 'v3'),
      routeParams(id)
    );
    expect(res3.status).toBe(202);
    const body3 = await res3.json();
    expect(body3.version_number).toBe(3);

    const versions = await db.execute<{ object_key: string }>(
      TENANT_A,
      `SELECT object_key FROM "DocumentVersion" WHERE document_id = $1`,
      [id]
    );
    versions.forEach((v) => uploadedObjectKeys.push(v.object_key));
  });
});
