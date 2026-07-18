import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { indexDocument } from '@/lib/search/indexing';
import { putObject, deleteObject } from '@/lib/storage/object-storage';

const TENANT_A = '00000000-0000-4000-8000-000000000f21';
const TENANT_B = '00000000-0000-4000-8000-000000000f22';
const USER_ID = '00000000-0000-4000-8000-000000000f23';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'search-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(url: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL(url), { headers });
}

const hasS3 = () => Boolean(process.env.S3_ENDPOINT);

describe('GET /api/search', () => {
  const db = new DatabaseClient();
  const uploadedObjectKeys: string[] = [];

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Search Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Search Test Tenant B',
    ]);
  });

  afterAll(async () => {
    await Promise.all(uploadedObjectKeys.map((key) => deleteObject(key).catch(() => {})));
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  async function createAndIndexDocument(tenantId: string, content: string): Promise<string> {
    const documentId = crypto.randomUUID();
    const objectKey = `${tenantId}/${documentId}/file.txt`;
    await putObject(objectKey, Buffer.from(content), 'text/plain');
    uploadedObjectKeys.push(objectKey);
    await db.execute(
      tenantId,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, tenantId, 'file.txt', { object_key: objectKey, content_type: 'text/plain' }]
    );
    await indexDocument(tenantId, documentId);
    return documentId;
  }

  test('rejects with no session (401)', async () => {
    const res = await GET(buildRequest('http://localhost/api/search?q=contract', {}));
    expect(res.status).toBe(401);
  });

  test('rejects a missing q parameter with 400', async () => {
    const res = await GET(
      buildRequest('http://localhost/api/search', { cookie: await sessionCookieHeader(TENANT_A) })
    );
    expect(res.status).toBe(400);
  });

  test('finds a full-text match via the plain q term', async () => {
    if (!hasS3()) return;
    await createAndIndexDocument(TENANT_A, 'The defendant breached the contract and owes damages. '.repeat(20));

    const res = await GET(
      buildRequest('http://localhost/api/search?q=breached%20contract', {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0].content).toContain('breached the contract');
  });

  test('never returns another tenant\'s chunks', async () => {
    if (!hasS3()) return;
    const tenantBDocId = await createAndIndexDocument(
      TENANT_B,
      'Tenant B private confidential settlement terms. '.repeat(20)
    );

    // Vector similarity always ranks the tenant's own top-K rows (it has no
    // "no match" threshold the way full-text @@ does), so a same-tenant
    // result set isn't itself proof of isolation — the real assertion is
    // that TENANT_B's document never appears in TENANT_A's results.
    const res = await GET(
      buildRequest('http://localhost/api/search?q=confidential%20settlement', {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.every((r: { envelope_id: string }) => r.envelope_id !== tenantBDocId)).toBe(true);

    // And TENANT_B can find its own document via full-text match.
    const resB = await GET(
      buildRequest('http://localhost/api/search?q=confidential%20settlement', {
        cookie: await sessionCookieHeader(TENANT_B),
      })
    );
    const bodyB = await resB.json();
    expect(bodyB.results.some((r: { envelope_id: string }) => r.envelope_id === tenantBDocId)).toBe(true);
  });
});
