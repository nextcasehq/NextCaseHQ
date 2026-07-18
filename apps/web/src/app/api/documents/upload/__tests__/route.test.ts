import { NextRequest } from 'next/server';
import { POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000a1';
const TENANT_B = '00000000-0000-4000-8000-0000000000b1';
const USER_ID = '00000000-0000-4000-8000-00000000009a';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({
    sub: USER_ID,
    tenantId,
    email: 'upload-test@nextcase.local',
  });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/documents/upload'), {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', ...headers },
    body: 'file-bytes',
  });
}

describe('POST /api/documents/upload — server-enforced tenant authorization', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Upload Route Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Upload Route Test Tenant B',
    ]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  test('rejects a request from an untrusted origin (CSRF defense) even with a valid session', async () => {
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      origin: 'https://attacker.example',
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('INVALID_ORIGIN');
  });

  test('rejects requests with no session cookie (401)', async () => {
    const req = buildRequest({ 'x-tenant-key-version': 'v1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('rejects requests with an invalid/garbage session cookie (401)', async () => {
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: `${SESSION_COOKIE_NAME}=not-a-real-jwt`,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('processes the upload under the session tenant, ignoring a spoofed x-nextcase-tenant-id header', async () => {
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-nextcase-tenant-id': TENANT_B,
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.tenant_id).toBe(TENANT_A);
    expect(body.tenant_id).not.toBe(TENANT_B);
  });

  test('processes the upload under the session tenant, ignoring a spoofed x-tenant-id header', async () => {
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-tenant-id': TENANT_B,
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.tenant_id).toBe(TENANT_A);
  });

  test('a session for a different tenant produces a different resolved tenant_id (no cross-tenant bleed)', async () => {
    const reqA = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
    });
    const reqB = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_B),
    });
    const [bodyA, bodyB] = await Promise.all([
      POST(reqA).then((r) => r.json()),
      POST(reqB).then((r) => r.json()),
    ]);
    expect(bodyA.tenant_id).toBe(TENANT_A);
    expect(bodyB.tenant_id).toBe(TENANT_B);
  });

  test('still requires x-tenant-key-version (400) even when authenticated', async () => {
    const req = buildRequest({ cookie: await sessionCookieHeader(TENANT_A) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('persists a real DocumentEnvelope row, not a mock UUID', async () => {
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'petition-draft.pdf',
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();

    const rows = await db.execute(TENANT_A, `SELECT id, title FROM "DocumentEnvelope" WHERE id = $1`, [body.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('petition-draft.pdf');
  });

  test('rejects a malformed x-case-id (400)', async () => {
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-case-id': 'not-a-uuid',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('rejects a well-formed x-case-id that does not resolve to an accessible case (400, not 500)', async () => {
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-case-id': '00000000-0000-4000-8000-000000000000',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('links the document to a real case when x-case-id references one in the same tenant', async () => {
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Upload Linkage Test Case', 'IN']
    );
    const caseId = caseRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-case-id': caseId,
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.case_id).toBe(caseId);

    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE id = $1`, [caseId]);
  });

  test('rejects a case_id belonging to a different tenant (400, RLS-backed FK check)', async () => {
    const caseRows = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_B, 'Tenant B Case', 'US']
    );
    const tenantBCaseId = caseRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-case-id': tenantBCaseId,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    await db.execute(TENANT_B, `DELETE FROM "LegalCase" WHERE id = $1`, [tenantBCaseId]);
  });
});
