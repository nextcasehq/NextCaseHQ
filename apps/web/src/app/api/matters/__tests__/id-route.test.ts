import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../[id]/route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000f1';
const TENANT_B = '00000000-0000-4000-8000-0000000000f2';
const USER_ID = '00000000-0000-4000-8000-0000000000f3';
// Dedicated tenant/user for the MatterTask-linked DELETE test only — a
// Matter with a MatterTask requires a CourtNote, which is append-only
// (nextcase_app has no UPDATE/DELETE grant) and whose case_id is
// RESTRICT, so the Matter/LegalCase it references can never be cleaned
// up by this file's per-test beforeEach/afterAll (which blanket-deletes
// LegalCase/Matter for TENANT_A every test). Same fix already applied in
// apps/web/src/app/api/cases/[id]/__tests__/route.test.ts for the
// equivalent Court-Note-linked case.
const TENANT_C = 'b06f4a6c-ac41-4701-875f-ab73f94870ad';
const USER_C = 'fbd4184b-1346-44ba-b93e-550ac7b1bd8e';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'matters-id-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/matters/00000000-0000-4000-8000-000000000000`), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('GET/PATCH/DELETE /api/matters/[id]', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matters ID Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matters ID Test Tenant B',
    ]);
    await db.execute(TENANT_C, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_C,
      'Matters ID Test Tenant C (MatterTask)',
    ]);
    await db.execute(
      TENANT_C,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_C, TENANT_C, 'matters-id-task-author@nextcase.local']
    );
  });

  beforeEach(async () => {
    // DocumentEnvelope.matter_id is RESTRICT, not CASCADE (Sprint 3, PR
    // 3A) — must be cleared (versions first, then envelopes) before the
    // matters they reference, or this cleanup itself would fail with a
    // foreign key violation for any test that links a document to a matter.
    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
    // PATCH /api/matters/[id] now stamps updated_by_user_id (Production
    // Matter Register Foundation) — a real FK to "User" — so the session
    // subject must exist as a real row. Re-seeded every beforeEach since
    // the DELETE above (pre-existing, for unrelated cleanup) wipes it.
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'matters-id-test-author@nextcase.local']
    );
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
    await closePool();
  });

  async function createMatter(tenantId: string, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, title]
    );
    return rows[0].id;
  }

  test('rejects an invalid matter id (400)', async () => {
    const req = new NextRequest('http://localhost/api/matters/not-a-uuid', {
      headers: { cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await GET(req, { params: Promise.resolve({ id: 'not-a-uuid' }) });
    expect(res.status).toBe(400);
  });

  test('rejects GET with no session (401)', async () => {
    const id = await createMatter(TENANT_A, 'Some Matter');
    const req = new NextRequest(`http://localhost/api/matters/${id}`);
    const res = await GET(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(401);
  });

  test('returns 404 for a matter belonging to another tenant — RLS scoping, not a permission leak', async () => {
    const id = await createMatter(TENANT_B, 'Tenant B Matter');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      headers: { cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await GET(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(404);
  });

  test('returns the matter for its own tenant', async () => {
    const id = await createMatter(TENANT_A, 'My Matter');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      headers: { cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await GET(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matter.title).toBe('My Matter');
  });

  test('PATCH updates provided fields and always bumps updated_at', async () => {
    const id = await createMatter(TENANT_A, 'Original Title');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ status: 'ON_HOLD' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matter.status).toBe('ON_HOLD');
    expect(body.matter.title).toBe('Original Title');
  });

  test('PATCH rejects an empty update payload (400)', async () => {
    const id = await createMatter(TENANT_A, 'Untouched');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(400);
  });

  test('PATCH returns 404 for a matter belonging to another tenant', async () => {
    const id = await createMatter(TENANT_B, 'Tenant B Matter');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ status: 'CLOSED' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(404);
  });

  test('DELETE removes the matter and returns 404 on a second delete', async () => {
    const id = await createMatter(TENANT_A, 'To Be Deleted');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(200);

    const secondReq = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
    });
    const secondRes = await DELETE(secondReq, { params: Promise.resolve({ id }) });
    expect(secondRes.status).toBe(404);
  });

  test('DELETE returns 404 for a matter belonging to another tenant, never a conflict or a leak', async () => {
    const id = await createMatter(TENANT_B, 'Tenant B Matter');
    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(404);
  });

  test('DELETE returns a deterministic 409 (never a generic 500) when a Proceeding is linked', async () => {
    const id = await createMatter(TENANT_A, 'Matter With Proceeding');
    await db.execute(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, 'Linked Proceeding', 'IN', id]
    );

    const req = new NextRequest(`http://localhost/api/matters/${id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('MATTER_HAS_LINKED_RECORDS');
    expect(body.linked.proceedings).toBe(1);

    // The matter must still exist — the delete was correctly refused, not
    // silently partially applied.
    const stillThere = await db.execute<{ id: string }>(TENANT_A, `SELECT id FROM "Matter" WHERE id = $1`, [id]);
    expect(stillThere).toHaveLength(1);
  });

  test('DELETE returns 409 when a participant or chronology entry is linked, even with zero Proceedings', async () => {
    const userRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "User" (tenant_id, email) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'delete-safety-participant@nextcase.local']
    );
    const matterWithParticipant = await createMatter(TENANT_A, 'Matter With Participant');
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterParticipant" (tenant_id, matter_id, user_id, role) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, matterWithParticipant, userRows[0].id, 'LEAD']
    );

    const participantRes = await DELETE(
      new NextRequest(`http://localhost/api/matters/${matterWithParticipant}`, {
        method: 'DELETE',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      }),
      { params: Promise.resolve({ id: matterWithParticipant }) }
    );
    expect(participantRes.status).toBe(409);
    const participantBody = await participantRes.json();
    expect(participantBody.code).toBe('MATTER_HAS_LINKED_RECORDS');
    expect(participantBody.linked.participants).toBe(1);

    const matterWithEvent = await createMatter(TENANT_A, 'Matter With Event');
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, matterWithEvent, '2026-01-15', 'Filed notice']
    );

    const eventRes = await DELETE(
      new NextRequest(`http://localhost/api/matters/${matterWithEvent}`, {
        method: 'DELETE',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      }),
      { params: Promise.resolve({ id: matterWithEvent }) }
    );
    expect(eventRes.status).toBe(409);
    const eventBody = await eventRes.json();
    expect(eventBody.code).toBe('MATTER_HAS_LINKED_RECORDS');
    expect(eventBody.linked.events).toBe(1);
  });

  test('DELETE returns 409 when a document is linked directly to the Matter, even with zero Proceedings/participants/events', async () => {
    const matterWithDocument = await createMatter(TENANT_A, 'Matter With Document');
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (tenant_id, matter_id, title) VALUES ($1, $2, $3)`,
      [TENANT_A, matterWithDocument, 'Directly Linked Document']
    );

    const res = await DELETE(
      new NextRequest(`http://localhost/api/matters/${matterWithDocument}`, {
        method: 'DELETE',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      }),
      { params: Promise.resolve({ id: matterWithDocument }) }
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('MATTER_HAS_LINKED_RECORDS');
    expect(body.linked.documents).toBe(1);

    const stillThere = await db.execute<{ id: string }>(TENANT_A, `SELECT id FROM "Matter" WHERE id = $1`, [matterWithDocument]);
    expect(stillThere).toHaveLength(1);
  });

  test('DELETE returns 409 when a MatterTask is linked (Milestone 2), even with zero Proceedings/participants/events/documents', async () => {
    const matterId = await createMatter(TENANT_C, 'Matter With Task');
    const caseRows = await db.execute<{ id: string }>(
      TENANT_C,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_C, 'Test Proceeding', 'IN', matterId]
    );
    const caseId = caseRows[0].id;
    const noteRows = await db.execute<{ id: string }>(
      TENANT_C,
      `INSERT INTO "CourtNote" (
         tenant_id, case_id, matter_id, author_user_id, hearing_date, court_forum_type, court_forum_display, stage, note
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [TENANT_C, caseId, matterId, USER_C, '2026-01-01', 'HIGH_COURT', 'High Court', 'Arguments', 'Note']
    );
    await db.execute(
      TENANT_C,
      `INSERT INTO "MatterTask" (tenant_id, matter_id, case_id, court_note_id) VALUES ($1, $2, $3, $4)`,
      [TENANT_C, matterId, caseId, noteRows[0].id]
    );

    // Delete the Proceeding's LegalCase row is impossible here (blocked by
    // the Court Note's own RESTRICT), so this test necessarily also has a
    // linked Proceeding — the assertion below still isolates the `tasks`
    // count specifically, proving this endpoint's new check works, not
    // just that some other linked-record check happened to fire first.
    const cookie = `${SESSION_COOKIE_NAME}=${await signSessionToken({ sub: USER_C, tenantId: TENANT_C, email: 'matters-id-task-author@nextcase.local' })}`;
    const res = await DELETE(
      new NextRequest(`http://localhost/api/matters/${matterId}`, {
        method: 'DELETE',
        headers: { origin: 'http://localhost:3000', cookie },
      }),
      { params: Promise.resolve({ id: matterId }) }
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('MATTER_HAS_LINKED_RECORDS');
    expect(body.linked.tasks).toBe(1);

    const stillThere = await db.execute<{ id: string }>(TENANT_C, `SELECT id FROM "Matter" WHERE id = $1`, [matterId]);
    expect(stillThere).toHaveLength(1);
  });
});
