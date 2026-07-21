import { NextRequest } from 'next/server';
import { POST as CLOSE } from '../route';
import { POST as REOPEN } from '../../reopen/route';
import { PATCH as PATCH_MATTER } from '../../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { MATTER_CLOSURE_CONFIRMATION_STATEMENT } from '@/lib/domain/matter-closure';

const TENANT_A = '00000000-0000-4000-8000-0000000000a1';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';
const USER_A = '00000000-0000-4000-8000-0000000000a2';

async function sessionCookieHeader(): Promise<string> {
  const token = await signSessionToken({ sub: USER_A, tenantId: TENANT_A, email: 'matter-closure-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(path: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(`http://localhost${path}`), {
    method,
    headers: { origin: 'http://localhost:3000' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function authedRequest(path: string, method: string, cookie: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(`http://localhost${path}`), {
    method,
    headers: { origin: 'http://localhost:3000', cookie },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/matters/[id]/close and /reopen — Matter closure and reopening lifecycle', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matter Closure Test Tenant',
    ]);
    await db.execute(TENANT_A, `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [
      USER_A,
      TENANT_A,
      'matter-closure-advocate@nextcase.local',
    ]);
  });

  afterAll(async () => {
    await closePool();
  });

  async function createMatter(): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Matter to Close']
    );
    return rows[0].id;
  }

  const VALID_CLOSURE = {
    closure_reason: 'MATTER_DISPOSED',
    final_outcome: 'Suit decreed in favour of plaintiff.',
    disposal_date: '2026-06-01',
    confirmation_statement: MATTER_CLOSURE_CONFIRMATION_STATEMENT,
  };

  test('rejects close with no session (401)', async () => {
    const matterId = await createMatter();
    const res = await CLOSE(buildRequest(`/api/matters/${matterId}/close`, 'POST', VALID_CLOSURE), routeParams(matterId));
    expect(res.status).toBe(401);
  });

  test('rejects closure when confirmation_statement does not match exactly (400)', async () => {
    const matterId = await createMatter();
    const cookie = await sessionCookieHeader();
    const res = await CLOSE(
      authedRequest(`/api/matters/${matterId}/close`, 'POST', cookie, { ...VALID_CLOSURE, confirmation_statement: 'I agree.' }),
      routeParams(matterId)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('CONFIRMATION_STATEMENT_MISMATCH');
  });

  test('rejects an invalid closure_reason (400)', async () => {
    const matterId = await createMatter();
    const cookie = await sessionCookieHeader();
    const res = await CLOSE(
      authedRequest(`/api/matters/${matterId}/close`, 'POST', cookie, { ...VALID_CLOSURE, closure_reason: 'NOT_A_REAL_REASON' }),
      routeParams(matterId)
    );
    expect(res.status).toBe(400);
  });

  test('closes a matter, recording exactly one MatterClosureRecord and flipping status to CLOSED', async () => {
    const matterId = await createMatter();
    const cookie = await sessionCookieHeader();
    const res = await CLOSE(authedRequest(`/api/matters/${matterId}/close`, 'POST', cookie, VALID_CLOSURE), routeParams(matterId));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.closure.closure_reason).toBe('MATTER_DISPOSED');
    expect(body.closure.confirming_advocate_id).toBe(USER_A);

    const matterRows = await db.execute<{ status: string; closed_at: string | null }>(
      TENANT_A,
      `SELECT status, closed_at FROM "Matter" WHERE id = $1`,
      [matterId]
    );
    expect(matterRows[0].status).toBe('CLOSED');
    expect(matterRows[0].closed_at).not.toBeNull();

    const closureRows = await db.execute<{ id: string }>(TENANT_A, `SELECT id FROM "MatterClosureRecord" WHERE matter_id = $1`, [matterId]);
    expect(closureRows).toHaveLength(1);

    const auditRows = await db.execute<{ action: string }>(
      TENANT_A,
      `SELECT action FROM "MatterAuditEvent" WHERE matter_id = $1 AND action = 'MATTER_CLOSED'`,
      [matterId]
    );
    expect(auditRows).toHaveLength(1);
  });

  test('rejects closing an already-closed matter (409)', async () => {
    const matterId = await createMatter();
    const cookie = await sessionCookieHeader();
    await CLOSE(authedRequest(`/api/matters/${matterId}/close`, 'POST', cookie, VALID_CLOSURE), routeParams(matterId));
    const res = await CLOSE(authedRequest(`/api/matters/${matterId}/close`, 'POST', cookie, VALID_CLOSURE), routeParams(matterId));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('MATTER_ALREADY_CLOSED');
  });

  test('a closed matter is read-only: ordinary PATCH field edits are rejected (409)', async () => {
    const matterId = await createMatter();
    const cookie = await sessionCookieHeader();
    await CLOSE(authedRequest(`/api/matters/${matterId}/close`, 'POST', cookie, VALID_CLOSURE), routeParams(matterId));

    const patchRes = await PATCH_MATTER(
      authedRequest(`/api/matters/${matterId}`, 'PATCH', cookie, { title: 'Attempted silent edit' }),
      routeParams(matterId)
    );
    expect(patchRes.status).toBe(409);
    const patchBody = await patchRes.json();
    expect(patchBody.code).toBe('MATTER_CLOSED_READ_ONLY');

    const matterRows = await db.execute<{ title: string }>(TENANT_A, `SELECT title FROM "Matter" WHERE id = $1`, [matterId]);
    expect(matterRows[0].title).toBe('Matter to Close');
  });

  test('returns 404 for a well-formed but non-existent matter id', async () => {
    const cookie = await sessionCookieHeader();
    const res = await CLOSE(authedRequest(`/api/matters/${NON_EXISTENT_ID}/close`, 'POST', cookie, VALID_CLOSURE), routeParams(NON_EXISTENT_ID));
    expect(res.status).toBe(404);
  });

  test('MatterClosureRecord is append-only: direct UPDATE/DELETE is rejected by the database grant', async () => {
    const matterId = await createMatter();
    const cookie = await sessionCookieHeader();
    const closeRes = await CLOSE(authedRequest(`/api/matters/${matterId}/close`, 'POST', cookie, VALID_CLOSURE), routeParams(matterId));
    const { closure } = await closeRes.json();

    await expect(
      db.execute(TENANT_A, `UPDATE "MatterClosureRecord" SET final_outcome = 'tampered' WHERE id = $1`, [closure.id])
    ).rejects.toThrow(/permission denied/i);
    await expect(db.execute(TENANT_A, `DELETE FROM "MatterClosureRecord" WHERE id = $1`, [closure.id])).rejects.toThrow(
      /permission denied/i
    );
  });

  describe('reopening', () => {
    test('rejects reopening a matter that is not closed (409)', async () => {
      const matterId = await createMatter();
      const cookie = await sessionCookieHeader();
      const res = await REOPEN(
        authedRequest(`/api/matters/${matterId}/reopen`, 'POST', cookie, { reopening_reason: 'RESTORATION' }),
        routeParams(matterId)
      );
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe('MATTER_NOT_CLOSED');
    });

    test('reopens a closed matter, preserving the original closure record untouched', async () => {
      const matterId = await createMatter();
      const cookie = await sessionCookieHeader();
      const closeRes = await CLOSE(authedRequest(`/api/matters/${matterId}/close`, 'POST', cookie, VALID_CLOSURE), routeParams(matterId));
      const { closure } = await closeRes.json();

      const reopenRes = await REOPEN(
        authedRequest(`/api/matters/${matterId}/reopen`, 'POST', cookie, { reopening_reason: 'RESTORATION', notes: 'Client sought restoration.' }),
        routeParams(matterId)
      );
      expect(reopenRes.status).toBe(201);
      const reopenBody = await reopenRes.json();
      expect(reopenBody.reopening.closure_record_id).toBe(closure.id);
      expect(reopenBody.reopening.reopening_reason).toBe('RESTORATION');

      // The Matter is no longer CLOSED (read-only lifted)...
      const matterRows = await db.execute<{ status: string; closed_at: string | null }>(
        TENANT_A,
        `SELECT status, closed_at FROM "Matter" WHERE id = $1`,
        [matterId]
      );
      expect(matterRows[0].status).toBe('REOPENED');
      expect(matterRows[0].closed_at).toBeNull();

      // ...but the original closure record is byte-for-byte unchanged.
      const closureRows = await db.execute<{ closure_reason: string; final_outcome: string }>(
        TENANT_A,
        `SELECT closure_reason, final_outcome FROM "MatterClosureRecord" WHERE id = $1`,
        [closure.id]
      );
      expect(closureRows[0].closure_reason).toBe('MATTER_DISPOSED');
      expect(closureRows[0].final_outcome).toBe('Suit decreed in favour of plaintiff.');

      // Ordinary edits are allowed again now that the matter is reopened.
      const patchRes = await PATCH_MATTER(
        authedRequest(`/api/matters/${matterId}`, 'PATCH', cookie, { title: 'Restored and amended' }),
        routeParams(matterId)
      );
      expect(patchRes.status).toBe(200);
    });

    test('MatterReopeningRecord is append-only: direct UPDATE/DELETE is rejected by the database grant', async () => {
      const matterId = await createMatter();
      const cookie = await sessionCookieHeader();
      await CLOSE(authedRequest(`/api/matters/${matterId}/close`, 'POST', cookie, VALID_CLOSURE), routeParams(matterId));
      const reopenRes = await REOPEN(
        authedRequest(`/api/matters/${matterId}/reopen`, 'POST', cookie, { reopening_reason: 'RESTORATION' }),
        routeParams(matterId)
      );
      const { reopening } = await reopenRes.json();

      await expect(
        db.execute(TENANT_A, `UPDATE "MatterReopeningRecord" SET reopening_reason = 'RECALL' WHERE id = $1`, [reopening.id])
      ).rejects.toThrow(/permission denied/i);
      await expect(db.execute(TENANT_A, `DELETE FROM "MatterReopeningRecord" WHERE id = $1`, [reopening.id])).rejects.toThrow(
        /permission denied/i
      );
    });
  });
});
