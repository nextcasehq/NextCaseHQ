import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { PATCH } from '../[id]/route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

/**
 * Milestone 1 condition: "Preserve backward compatibility. Existing
 * LegalCase records must continue working even when matter_id is null."
 * This suite proves that plus the new matter_id linkage added to /api/cases.
 */

const TENANT_A = '00000000-0000-4000-8000-000000000401';
const TENANT_B = '00000000-0000-4000-8000-000000000402';
const USER_ID = '00000000-0000-4000-8000-000000000403';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'case-matter-linkage-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: unknown, query = ''): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/cases${query}`), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('LegalCase <-> Matter linkage (backward-compatibility regression)', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Case Matter Linkage Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Case Matter Linkage Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await closePool();
  });

  test('a case created with no matter_id (the pre-Milestone-1 shape) persists with matter_id null', async () => {
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A) },
      { title: 'Legacy-style Case', country_code: 'IN' }
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.case.matter_id).toBeNull();
  });

  test('GET /api/cases with no matter_id filter still returns pre-existing unlinked cases', async () => {
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'Unlinked Case', country_code: 'IN' })
    );
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }));
    const body = await res.json();
    expect(body.cases).toHaveLength(1);
    expect(body.cases[0].matter_id).toBeNull();
  });

  test('creates a case linked to a real matter under the same tenant', async () => {
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Parent Matter']
    );
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A) },
      { title: 'Linked Proceeding', country_code: 'IN', matter_id: matterRows[0].id }
    );
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.case.matter_id).toBe(matterRows[0].id);
  });

  test('rejects a matter_id belonging to another tenant (FK-bypasses-RLS re-verification)', async () => {
    const otherTenantMatterRows = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, 'Tenant B Matter']
    );
    const req = buildRequest(
      'POST',
      { cookie: await sessionCookieHeader(TENANT_A) },
      { title: 'Cross-tenant matter attempt', country_code: 'IN', matter_id: otherTenantMatterRows[0].id }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('GET /api/cases?matter_id= filters to only proceedings under that matter', async () => {
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Filter Matter']
    );
    await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { title: 'Linked to Matter', country_code: 'IN', matter_id: matterRows[0].id }
      )
    );
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'Unlinked', country_code: 'IN' })
    );

    const res = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }, undefined, `?matter_id=${matterRows[0].id}`)
    );
    const body = await res.json();
    expect(body.cases).toHaveLength(1);
    expect(body.cases[0].title).toBe('Linked to Matter');
  });

  test('PATCH can attach an existing case to a matter after creation', async () => {
    const caseRows = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'Retroactively Linked', country_code: 'IN' })
    );
    const caseBody = await caseRows.json();
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Retroactive Matter']
    );

    const patchReq = new NextRequest(`http://localhost/api/cases/${caseBody.case.id}`, {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ matter_id: matterRows[0].id }),
    });
    const patchRes = await PATCH(patchReq, { params: Promise.resolve({ id: caseBody.case.id }) });
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.case.matter_id).toBe(matterRows[0].id);
  });

  test('GET /api/cases surfaces the linked Matter title and client name for display (Case Diary "which Matter" gap)', async () => {
    const clientRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Client" (tenant_id, name) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Acme Textiles']
    );
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title, client_id) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Acme Recovery Suit', clientRows[0].id]
    );
    await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { title: 'Linked to Matter With Client', country_code: 'IN', matter_id: matterRows[0].id }
      )
    );
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { title: 'Standalone', country_code: 'IN' })
    );

    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }));
    const body = await res.json();
    const linked = body.cases.find((c: { title: string }) => c.title === 'Linked to Matter With Client');
    const standalone = body.cases.find((c: { title: string }) => c.title === 'Standalone');
    expect(linked.matter_title).toBe('Acme Recovery Suit');
    expect(linked.client_name).toBe('Acme Textiles');
    expect(standalone.matter_title).toBeNull();
    expect(standalone.client_name).toBeNull();
  });
});
