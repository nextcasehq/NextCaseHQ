import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { POST as CREATE_PROCEEDING } from '../../proceedings/route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000071';
const TENANT_B = '00000000-0000-4000-8000-000000000072';
const USER_A = '00000000-0000-4000-8000-000000000073';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_A, tenantId, email: 'parties-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>, method = 'GET', body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/matters/placeholder/parties'), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST/GET /api/matters/[id]/parties — parties and procedural roles', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Parties Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Parties Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A, TENANT_A, 'parties-author@nextcase.local']
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
    const res = await POST(buildRequest({}, 'POST', { display_name: 'Rajeshwari Textiles', procedural_role: 'PLAINTIFF' }), routeParams(matterId));
    expect(res.status).toBe(401);
  });

  test('adds a party with a procedural role', async () => {
    const matterId = await createMatter(TENANT_A);
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', {
        display_name: 'Rajeshwari Textiles',
        procedural_role: 'PLAINTIFF',
        represented_side: 'OUR_CLIENT',
      }),
      routeParams(matterId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.party.display_name).toBe('Rajeshwari Textiles');
    expect(body.party.procedural_role).toBe('PLAINTIFF');
    expect(body.party.represented_side).toBe('OUR_CLIENT');
  });

  test('a role change on appeal is a NEW row scoped to the new proceeding — the trial-stage row is never overwritten', async () => {
    const matterId = await createMatter(TENANT_A);
    const cookie = await sessionCookieHeader(TENANT_A);

    const trialRes = await CREATE_PROCEEDING(buildRequest({ cookie }, 'POST', { title: 'Trial' }), routeParams(matterId));
    const trialBody = await trialRes.json();
    const trialProceedingId = trialBody.proceeding.id;

    const appealRes = await CREATE_PROCEEDING(
      buildRequest({ cookie }, 'POST', {
        title: 'Appeal',
        prior_proceeding_id: trialProceedingId,
        relationship_to_prior: 'APPEAL',
      }),
      routeParams(matterId)
    );
    const appealBody = await appealRes.json();
    const appealProceedingId = appealBody.proceeding.id;

    // At trial: our client was the Plaintiff.
    const trialPartyRes = await POST(
      buildRequest({ cookie }, 'POST', {
        proceeding_id: trialProceedingId,
        display_name: 'Rajeshwari Textiles',
        procedural_role: 'PLAINTIFF',
      }),
      routeParams(matterId)
    );
    const trialPartyBody = await trialPartyRes.json();

    // On appeal: same real-world party, now the Respondent (positions can flip).
    const appealPartyRes = await POST(
      buildRequest({ cookie }, 'POST', {
        proceeding_id: appealProceedingId,
        display_name: 'Rajeshwari Textiles',
        procedural_role: 'RESPONDENT',
        earlier_procedural_role: 'PLAINTIFF',
      }),
      routeParams(matterId)
    );
    expect(appealPartyRes.status).toBe(201);
    const appealPartyBody = await appealPartyRes.json();
    expect(appealPartyBody.party.procedural_role).toBe('RESPONDENT');
    expect(appealPartyBody.party.earlier_procedural_role).toBe('PLAINTIFF');

    // The earlier trial-stage MatterParty row is completely untouched —
    // its own procedural_role still reads PLAINTIFF, never overwritten to
    // RESPONDENT in place.
    const trialPartyRows = await db.execute<{ procedural_role: string; proceeding_id: string }>(
      TENANT_A,
      `SELECT procedural_role, proceeding_id FROM "MatterParty" WHERE id = $1`,
      [trialPartyBody.party.id]
    );
    expect(trialPartyRows[0].procedural_role).toBe('PLAINTIFF');
    expect(trialPartyRows[0].proceeding_id).toBe(trialProceedingId);

    // Both rows coexist — the full role history across proceedings is
    // reconstructable from the set of MatterParty rows.
    const listRes = await GET(buildRequest({ cookie }), routeParams(matterId));
    const listBody = await listRes.json();
    expect(listBody.parties).toHaveLength(2);
    const roles = listBody.parties.map((p: { procedural_role: string }) => p.procedural_role).sort();
    expect(roles).toEqual(['PLAINTIFF', 'RESPONDENT']);
  });

  test('rejects adding a party to a closed matter (409)', async () => {
    const matterId = await createMatter(TENANT_A);
    await db.execute(TENANT_A, `UPDATE "Matter" SET status = 'CLOSED' WHERE id = $1`, [matterId]);
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { display_name: 'Late Party', procedural_role: 'INTERVENOR' }),
      routeParams(matterId)
    );
    expect(res.status).toBe(409);
  });

  test('parties are not visible from another tenant session (RLS)', async () => {
    const matterId = await createMatter(TENANT_A);
    await POST(
      buildRequest({ cookie: await sessionCookieHeader(TENANT_A) }, 'POST', { display_name: 'Private Party', procedural_role: 'PLAINTIFF' }),
      routeParams(matterId)
    );
    const res = await GET(buildRequest({ cookie: await sessionCookieHeader(TENANT_B) }), routeParams(matterId));
    expect(res.status).toBe(404);
  });
});
