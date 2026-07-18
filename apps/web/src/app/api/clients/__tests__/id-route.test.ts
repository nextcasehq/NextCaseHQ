import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../[id]/route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000501';
const TENANT_B = '00000000-0000-4000-8000-000000000502';
const USER_ID = '00000000-0000-4000-8000-000000000503';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'clients-id-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

type RouteParams = { params: Promise<{ id: string }> };

describe('GET/PATCH/DELETE /api/clients/[id]', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Clients ID Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Clients ID Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  async function createClient(tenantId: string, name: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Client" (tenant_id, name) VALUES ($1, $2) RETURNING id`,
      [tenantId, name]
    );
    return rows[0].id;
  }

  const paramsFor = (id: string): RouteParams => ({ params: Promise.resolve({ id }) });

  test('DELETE removes a client with no linked matters', async () => {
    const id = await createClient(TENANT_A, 'No Matters Client');
    const req = new NextRequest(`http://localhost/api/clients/${id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await DELETE(req, paramsFor(id));
    expect(res.status).toBe(200);
  });

  test('DELETE returns 404 for a client belonging to another tenant, never a conflict or a leak', async () => {
    const id = await createClient(TENANT_B, 'Tenant B Client');
    const req = new NextRequest(`http://localhost/api/clients/${id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await DELETE(req, paramsFor(id));
    expect(res.status).toBe(404);
  });

  test('DELETE returns a deterministic 409 (never a generic 500) when a Matter is linked', async () => {
    const clientId = await createClient(TENANT_A, 'Client With Matter');
    await db.execute(TENANT_A, `INSERT INTO "Matter" (tenant_id, title, client_id) VALUES ($1, $2, $3)`, [
      TENANT_A,
      'Linked Matter',
      clientId,
    ]);

    const req = new NextRequest(`http://localhost/api/clients/${clientId}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await DELETE(req, paramsFor(clientId));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('CLIENT_HAS_LINKED_MATTERS');
    expect(body.linked.matters).toBe(1);

    // The client must still exist — the delete was correctly refused, not
    // silently partially applied.
    const stillThere = await db.execute<{ id: string }>(TENANT_A, `SELECT id FROM "Client" WHERE id = $1`, [clientId]);
    expect(stillThere).toHaveLength(1);
  });

  test('a second delete after removing the linked matter succeeds', async () => {
    const clientId = await createClient(TENANT_A, 'Client Eventually Freed');
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title, client_id) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Temporary Matter', clientId]
    );

    const blockedRes = await DELETE(
      new NextRequest(`http://localhost/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      }),
      paramsFor(clientId)
    );
    expect(blockedRes.status).toBe(409);

    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [matterRows[0].id]);

    const secondRes = await DELETE(
      new NextRequest(`http://localhost/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      }),
      paramsFor(clientId)
    );
    expect(secondRes.status).toBe(200);
  });

  test('GET returns 404 for an invalid client id format', async () => {
    const req = new NextRequest('http://localhost/api/clients/not-a-uuid', {
      headers: { cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await GET(req, paramsFor('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('PATCH still works unaffected by the delete-safety change', async () => {
    const id = await createClient(TENANT_A, 'Original Name');
    const req = new NextRequest(`http://localhost/api/clients/${id}`, {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ name: 'Renamed' }),
    });
    const res = await PATCH(req, paramsFor(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.client.name).toBe('Renamed');
  });
});
