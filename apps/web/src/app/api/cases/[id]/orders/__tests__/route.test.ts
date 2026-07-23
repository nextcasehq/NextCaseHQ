import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { PATCH } from '../[orderId]/route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

/**
 * Court Orders as first-class records (Case Diary Phase 1 closure) — an
 * advocate can record an order, connect it to the hearing it arose from,
 * attach an uploaded copy, and mark whether a certified copy is required.
 */

const TENANT_A = '3f6a2c9e-9b1e-4a3d-8f2a-6b6e6a3c9e11';
const TENANT_B = '3f6a2c9e-9b1e-4a3d-8f2a-6b6e6a3c9e22';
const USER_ID = '3f6a2c9e-9b1e-4a3d-8f2a-6b6e6a3c9e33';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'court-orders-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/cases/placeholder/orders'), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function orderRouteParams(id: string, orderId: string) {
  return { params: Promise.resolve({ id, orderId }) };
}

describe('GET/POST /api/cases/[id]/orders and PATCH /api/cases/[id]/orders/[orderId] — Court Orders', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Court Orders Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Court Orders Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'court-orders-author@nextcase.local']
    );
  });

  afterAll(async () => {
    await closePool();
  });

  async function createCase(tenantId: string, matterId?: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, 'Test Proceeding', 'IN', matterId ?? null]
    );
    return rows[0].id;
  }

  async function createMatter(tenantId: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, 'Test Matter']
    );
    return rows[0].id;
  }

  async function createCourtNote(tenantId: string, caseId: string, matterId?: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "CourtNote" (tenant_id, case_id, matter_id, author_user_id, hearing_date, court_forum_type,
                                court_forum_display, stage, hearing_outcome, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [tenantId, caseId, matterId ?? null, USER_ID, '2026-02-01', 'HIGH_COURT', 'High Court', 'Arguments', 'RESERVED_FOR_ORDERS', 'Arguments concluded, order reserved.']
    );
    return rows[0].id;
  }

  test('creates a Court Order with no certified copy required', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { order_date: '2026-02-05', summary: 'Interim stay granted for four weeks.' }
      ),
      routeParams(caseId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.order.certified_copy_required).toBe(false);
    expect(body.order.certified_copy_status).toBe('NOT_REQUIRED');
    expect(body.order.case_id).toBe(caseId);
  });

  test('creates a Court Order requiring a certified copy, defaulting status to PENDING', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { order_date: '2026-02-05', summary: 'Petition disposed of.', certified_copy_required: true }
      ),
      routeParams(caseId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.order.certified_copy_required).toBe(true);
    expect(body.order.certified_copy_status).toBe('PENDING');
  });

  test('connects an order to the hearing it arose from via court_note_id', async () => {
    const caseId = await createCase(TENANT_A);
    const noteId = await createCourtNote(TENANT_A, caseId);
    const res = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { order_date: '2026-02-08', summary: 'Order pronounced pursuant to reserved arguments.', court_note_id: noteId }
      ),
      routeParams(caseId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.order.court_note_id).toBe(noteId);
  });

  test('rejects a court_note_id belonging to a different Proceeding', async () => {
    const caseId = await createCase(TENANT_A);
    const otherCaseId = await createCase(TENANT_A);
    const foreignNoteId = await createCourtNote(TENANT_A, otherCaseId);
    const res = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { order_date: '2026-02-08', summary: 'Should fail.', court_note_id: foreignNoteId }
      ),
      routeParams(caseId)
    );
    expect(res.status).toBe(400);
  });

  test('rejects a document_id belonging to another tenant (FK-bypasses-RLS re-verification)', async () => {
    const caseId = await createCase(TENANT_A);
    const otherTenantDocRows = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title, storage_structure) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_B, 'Foreign Doc', '{}']
    );
    const res = await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { order_date: '2026-02-08', summary: 'Should fail.', document_id: otherTenantDocRows[0].id }
      ),
      routeParams(caseId)
    );
    expect(res.status).toBe(400);
  });

  test('rejects when the parent Matter is closed', async () => {
    const matterId = await createMatter(TENANT_A);
    await db.execute(TENANT_A, `UPDATE "Matter" SET status = 'CLOSED' WHERE id = $1`, [matterId]);
    const caseId = await createCase(TENANT_A, matterId);
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { order_date: '2026-02-08', summary: 'Should fail.' }),
      routeParams(caseId)
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('MATTER_CLOSED_READ_ONLY');
  });

  test('appends a MatterEvent (source_type=ORDER) when the Proceeding is matter-linked', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId);
    await POST(
      buildRequest(
        'POST',
        { cookie: await sessionCookieHeader(TENANT_A) },
        { order_date: '2026-02-09', summary: 'Bail granted on furnishing surety.' }
      ),
      routeParams(caseId)
    );
    const events = await db.execute<{ source_type: string; description: string }>(
      TENANT_A,
      `SELECT source_type, description FROM "MatterEvent" WHERE matter_id = $1`,
      [matterId]
    );
    expect(events).toHaveLength(1);
    expect(events[0].source_type).toBe('ORDER');
    expect(events[0].description).toContain('Bail granted');
  });

  test('does NOT append a MatterEvent for a standalone (unlinked) Proceeding', async () => {
    const caseId = await createCase(TENANT_A);
    const res = await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { order_date: '2026-02-09', summary: 'Standalone order.' }),
      routeParams(caseId)
    );
    const body = await res.json();
    expect(body.order.matter_id).toBeNull();
  });

  test('GET lists orders for a case, most recent order_date first', async () => {
    const caseId = await createCase(TENANT_A);
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { order_date: '2026-01-01', summary: 'Earlier order.' }),
      routeParams(caseId)
    );
    await POST(
      buildRequest('POST', { cookie: await sessionCookieHeader(TENANT_A) }, { order_date: '2026-02-01', summary: 'Later order.' }),
      routeParams(caseId)
    );
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(caseId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders).toHaveLength(2);
    expect(body.orders[0].summary).toBe('Later order.');
  });

  test('a case belonging to another tenant is invisible (RLS)', async () => {
    const caseId = await createCase(TENANT_B);
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(caseId));
    const body = await res.json();
    expect(body.orders).toHaveLength(0);
  });

  describe('PATCH — advancing certified_copy_status', () => {
    async function createOrder(tenantId: string, caseId: string, required = true): Promise<string> {
      const res = await POST(
        buildRequest(
          'POST',
          { cookie: await sessionCookieHeader(tenantId) },
          { order_date: '2026-02-05', summary: 'Order requiring a certified copy.', certified_copy_required: required }
        ),
        routeParams(caseId)
      );
      const body = await res.json();
      return body.order.id;
    }

    test('advances PENDING -> APPLIED_FOR -> RECEIVED', async () => {
      const caseId = await createCase(TENANT_A);
      const orderId = await createOrder(TENANT_A, caseId);

      const appliedRes = await PATCH(
        buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { certified_copy_status: 'APPLIED_FOR' }),
        orderRouteParams(caseId, orderId)
      );
      expect(appliedRes.status).toBe(200);
      expect((await appliedRes.json()).order.certified_copy_status).toBe('APPLIED_FOR');

      const receivedRes = await PATCH(
        buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { certified_copy_status: 'RECEIVED' }),
        orderRouteParams(caseId, orderId)
      );
      expect(receivedRes.status).toBe(200);
      expect((await receivedRes.json()).order.certified_copy_status).toBe('RECEIVED');
    });

    test('rejects an unrecognized certified_copy_status', async () => {
      const caseId = await createCase(TENANT_A);
      const orderId = await createOrder(TENANT_A, caseId);
      const res = await PATCH(
        buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { certified_copy_status: 'NOT_A_REAL_STATUS' }),
        orderRouteParams(caseId, orderId)
      );
      expect(res.status).toBe(400);
    });

    test('cannot PATCH an order belonging to another tenant (RLS)', async () => {
      const caseId = await createCase(TENANT_B);
      const orderId = await createOrder(TENANT_B, caseId);
      const res = await PATCH(
        buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { certified_copy_status: 'RECEIVED' }),
        orderRouteParams(caseId, orderId)
      );
      expect(res.status).toBe(404);
    });
  });
});
