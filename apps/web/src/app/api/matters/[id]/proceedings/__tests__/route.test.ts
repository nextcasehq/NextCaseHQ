import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000b1';
const TENANT_B = '00000000-0000-4000-8000-0000000000b2';
const USER_A = '00000000-0000-4000-8000-0000000000b3';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_A, tenantId, email: 'proceedings-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/matters/placeholder/proceedings'), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST/GET /api/matters/[id]/proceedings — proceeding chain and Further Proceedings', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Proceedings Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Proceedings Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A, TENANT_A, 'proceedings-author@nextcase.local']
    );
  });

  afterAll(async () => {
    await closePool();
  });

  async function createMatter(tenantId: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, 'Test Matter']
    );
    return rows[0].id;
  }

  test('rejects POST with no session (401)', async () => {
    const matterId = await createMatter(TENANT_A);
    const res = await POST(buildRequest({}, 'POST', { title: 'Trial Proceeding' }), routeParams(matterId));
    expect(res.status).toBe(401);
  });

  test('creates the first proceeding and sets it as the matter\'s current proceeding by default', async () => {
    const matterId = await createMatter(TENANT_A);
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', {
        title: 'Trial before District Court',
        case_number: 'OS 123/2026',
        country_code: 'IN',
        stage: 'Filing',
        hearing_date: '2026-04-01',
      }),
      routeParams(matterId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.proceeding.title).toBe('Trial before District Court');
    expect(body.proceeding.prior_proceeding_id).toBeNull();
    expect(body.proceeding.relationship_to_prior).toBeNull();

    const matterRows = await db.execute<{ current_proceeding_id: string; current_stage: string; next_hearing_date: string }>(
      TENANT_A,
      `SELECT current_proceeding_id, current_stage, next_hearing_date::text FROM "Matter" WHERE id = $1`,
      [matterId]
    );
    expect(matterRows[0].current_proceeding_id).toBe(body.proceeding.id);
    expect(matterRows[0].current_stage).toBe('Filing');
    expect(matterRows[0].next_hearing_date).toBe('2026-04-01');
  });

  test('creates a Further Proceeding (appeal) preserving the link to the prior proceeding — the trial row is never mutated', async () => {
    const matterId = await createMatter(TENANT_A);
    const cookie = await sessionCookieHeader(TENANT_A);
    const trialRes = await POST(
      buildRequest({ cookie }, 'POST', { title: 'Trial', case_number: 'OS 1/2026', stage: 'Disposed' }),
      routeParams(matterId)
    );
    const trialBody = await trialRes.json();
    const trialId = trialBody.proceeding.id;

    const appealRes = await POST(
      buildRequest({ cookie }, 'POST', {
        title: 'First Appeal',
        case_number: 'FA 45/2026',
        stage: 'Admission',
        prior_proceeding_id: trialId,
        relationship_to_prior: 'APPEAL',
      }),
      routeParams(matterId)
    );
    expect(appealRes.status).toBe(201);
    const appealBody = await appealRes.json();
    expect(appealBody.proceeding.prior_proceeding_id).toBe(trialId);
    expect(appealBody.proceeding.relationship_to_prior).toBe('APPEAL');

    // The trial proceeding's own row is completely untouched by the appeal's creation.
    const trialRows = await db.execute<{ title: string; case_number: string; stage: string }>(
      TENANT_A,
      `SELECT title, case_number, stage FROM "LegalCase" WHERE id = $1`,
      [trialId]
    );
    expect(trialRows[0]).toMatchObject({ title: 'Trial', case_number: 'OS 1/2026', stage: 'Disposed' });

    // Both proceedings coexist in the chain — closing/superseding one never removes the other.
    const listRes = await GET(buildRequest({ cookie }), routeParams(matterId));
    const listBody = await listRes.json();
    expect(listBody.proceedings).toHaveLength(2);
  });

  test('rejects a prior_proceeding_id that does not belong to this matter (400)', async () => {
    const matterId = await createMatter(TENANT_A);
    const otherMatterId = await createMatter(TENANT_A);
    const cookie = await sessionCookieHeader(TENANT_A);
    const otherRes = await POST(buildRequest({ cookie }, 'POST', { title: 'Unrelated Trial' }), routeParams(otherMatterId));
    const otherBody = await otherRes.json();

    const res = await POST(
      buildRequest({ cookie }, 'POST', { title: 'Cross-matter appeal', prior_proceeding_id: otherBody.proceeding.id, relationship_to_prior: 'APPEAL' }),
      routeParams(matterId)
    );
    expect(res.status).toBe(400);
  });

  test('set_as_current=false leaves the matter\'s current_proceeding_id unchanged', async () => {
    const matterId = await createMatter(TENANT_A);
    const cookie = await sessionCookieHeader(TENANT_A);
    const firstRes = await POST(buildRequest({ cookie }, 'POST', { title: 'Trial' }), routeParams(matterId));
    const firstBody = await firstRes.json();

    await POST(buildRequest({ cookie }, 'POST', { title: 'Connected proceeding', set_as_current: false }), routeParams(matterId));

    const matterRows = await db.execute<{ current_proceeding_id: string }>(
      TENANT_A,
      `SELECT current_proceeding_id FROM "Matter" WHERE id = $1`,
      [matterId]
    );
    expect(matterRows[0].current_proceeding_id).toBe(firstBody.proceeding.id);
  });

  test('proceedings are not visible from another tenant session (RLS)', async () => {
    const matterId = await createMatter(TENANT_A);
    await POST(buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { title: 'Private Trial' }), routeParams(matterId));

    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_B) }), routeParams(matterId));
    expect(res.status).toBe(404);
  });

  test('returns 404 for a well-formed but non-existent matter id', async () => {
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { title: 'Trial' }),
      routeParams(NON_EXISTENT_ID)
    );
    expect(res.status).toBe(404);
  });
});
