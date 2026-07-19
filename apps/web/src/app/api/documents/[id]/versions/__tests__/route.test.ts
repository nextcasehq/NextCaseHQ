import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { deleteObject } from '@/lib/storage/object-storage';

const TENANT_A = '00000000-0000-4000-8000-000000000801';
const TENANT_B = '00000000-0000-4000-8000-000000000802';
const USER_ID = '00000000-0000-4000-8000-000000000803';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

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
      'Versions Route Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Versions Route Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'versions-test@nextcase.local']
    );
  });

  afterAll(async () => {
    await Promise.all(uploadedObjectKeys.map((key) => deleteObject(key).catch(() => {})));
    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE id = $1`, [USER_ID]);
    await closePool();
  });

  async function createEnvelope(tenantId: string, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title, storage_structure) VALUES ($1, $2, $3) RETURNING id`,
      [tenantId, title, { object_key: `${tenantId}/seed/${title}`, bytes_stored: 1 }]
    );
    return rows[0].id;
  }

  test('GET rejects an invalid (non-UUID) id with 400', async () => {
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('GET rejects with no session (401)', async () => {
    const id = await createEnvelope(TENANT_A, 'Needs Auth');
    const res = await GET(buildRequest('GET', {}), routeParams(id));
    expect(res.status).toBe(401);
  });

  test('GET returns 404 for a document belonging to a different tenant', async () => {
    const id = await createEnvelope(TENANT_A, 'Belongs To A');
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_B) }), routeParams(id));
    expect(res.status).toBe(404);
  });

  test('GET returns 404 for a well-formed but non-existent id', async () => {
    const res = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }),
      routeParams(NON_EXISTENT_ID)
    );
    expect(res.status).toBe(404);
  });

  test('GET returns an empty list for a document with no explicit versions recorded', async () => {
    const id = await createEnvelope(TENANT_A, 'No Versions Yet');
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.versions).toEqual([]);
  });

  test('POST rejects an untrusted origin', async () => {
    if (!hasS3()) return;
    const id = await createEnvelope(TENANT_A, 'CSRF Target');
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example', 'x-file-name': 'v2.pdf' }, 'bytes'),
      routeParams(id)
    );
    expect(res.status).toBe(403);
  });

  test('POST returns 404 for a document belonging to a different tenant, before ever touching storage', async () => {
    if (!hasS3()) return;
    const id = await createEnvelope(TENANT_A, 'Cross Tenant Target');
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_B), 'x-file-name': 'v2.pdf' }, 'bytes'),
      routeParams(id)
    );
    expect(res.status).toBe(404);
  });

  test('POST requires x-file-name (400)', async () => {
    if (!hasS3()) return;
    const id = await createEnvelope(TENANT_A, 'Missing Filename');
    const res = await POST(buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, 'bytes'), routeParams(id));
    expect(res.status).toBe(400);
  });

  test('POST creates version 2 for a document that already has version 1, and updates the envelope pointer', async () => {
    if (!hasS3()) return;
    const id = await createEnvelope(TENANT_A, 'original.pdf');
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentVersion" (tenant_id, envelope_id, version_number, title, storage_structure)
       VALUES ($1, $2, 1, $3, $4)`,
      [TENANT_A, id, 'original.pdf', { object_key: `${TENANT_A}/${id}/original.pdf`, bytes_stored: 1 }]
    );

    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A), 'x-file-name': 'revised.pdf' }, 'revised bytes'),
      routeParams(id)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.version.version_number).toBe(2);
    expect(body.version.title).toBe('revised.pdf');
    expect(body.version.created_by).toBe(USER_ID);
    uploadedObjectKeys.push(body.version.storage_structure.object_key);

    const envelopeRows = await db.execute<{ title: string; storage_structure: { object_key: string; bytes_stored: number } }>(
      TENANT_A,
      `SELECT title, storage_structure FROM "DocumentEnvelope" WHERE id = $1`,
      [id]
    );
    expect(envelopeRows[0].title).toBe('revised.pdf');
    expect(envelopeRows[0].storage_structure.bytes_stored).toBe('revised bytes'.length);

    const listRes = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    const listBody = await listRes.json();
    expect(listBody.versions).toHaveLength(2);
    expect(listBody.versions[0].version_number).toBe(2);
    expect(listBody.versions[1].version_number).toBe(1);
  });
});
