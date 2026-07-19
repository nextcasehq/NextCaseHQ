import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000e1';
const TENANT_B = '00000000-0000-4000-8000-0000000000e2';
const USER_ID = '00000000-0000-4000-8000-00000000009d';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'documents-list-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>, query = ''): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/documents${query}`), { headers });
}

describe('GET /api/documents — real DocumentEnvelope listing', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Documents List Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Documents List Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await closePool();
  });

  test('rejects with no session (401)', async () => {
    const res = await GET(buildRequest({}));
    expect(res.status).toBe(401);
  });

  test('lists only the calling tenant\'s own documents — real RLS, not app-level filtering', async () => {
    await db.execute(TENANT_A, `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2)`, [TENANT_A, 'A Doc']);
    await db.execute(TENANT_B, `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2)`, [TENANT_B, 'B Doc']);

    const resA = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }));
    const bodyA = await resA.json();
    expect(bodyA.documents).toHaveLength(1);
    expect(bodyA.documents[0].title).toBe('A Doc');
    expect(bodyA.total).toBe(1);
  });

  test('filters by case_id', async () => {
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Filter Test Case', 'IN']
    );
    const caseId = caseRows[0].id;

    await db.execute(TENANT_A, `INSERT INTO "DocumentEnvelope" (tenant_id, case_id, title) VALUES ($1, $2, $3)`, [
      TENANT_A,
      caseId,
      'Linked Doc',
    ]);
    await db.execute(TENANT_A, `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2)`, [
      TENANT_A,
      'Unlinked Doc',
    ]);

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, `?case_id=${caseId}`));
    const body = await res.json();
    expect(body.documents).toHaveLength(1);
    expect(body.documents[0].title).toBe('Linked Doc');
  });

  test('filters by matter_id', async () => {
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Filter Test Matter']
    );
    const matterId = matterRows[0].id;

    await db.execute(TENANT_A, `INSERT INTO "DocumentEnvelope" (tenant_id, matter_id, title) VALUES ($1, $2, $3)`, [
      TENANT_A,
      matterId,
      'Matter Linked Doc',
    ]);
    await db.execute(TENANT_A, `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2)`, [
      TENANT_A,
      'Unlinked Doc',
    ]);

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, `?matter_id=${matterId}`));
    const body = await res.json();
    expect(body.documents).toHaveLength(1);
    expect(body.documents[0].title).toBe('Matter Linked Doc');
  });

  test('rejects an out-of-range limit (400)', async () => {
    const res = await GET(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, '?limit=99999')
    );
    expect(res.status).toBe(400);
  });
});
