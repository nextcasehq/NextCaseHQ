import { NextRequest } from 'next/server';
import { getCachedMatterContext } from '../cache';
import { PATCH as patchMatter } from '@/app/api/matters/[id]/route';
import { POST as postEvent } from '@/app/api/matters/[id]/events/route';
import { POST as postParticipant } from '@/app/api/matters/[id]/participants/route';
import { POST as postCase } from '@/app/api/cases/route';
import { PATCH as patchCase, DELETE as deleteCase } from '@/app/api/cases/[id]/route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { getRedisClient, __resetRedisClientForTests } from '@/lib/security/redis-client';

/**
 * Proves invalidateMatterContext is actually wired into the real mutation
 * routes — not just that the cache module works in isolation (see
 * cache.test.ts). Each test primes the cache with the matter's current
 * state, performs a real mutation through the real route handler, and
 * confirms a subsequent read reflects the new state rather than serving
 * what was cached before the mutation.
 */

const TENANT_A = '00000000-0000-4000-8000-000000000711';
const USER_ID = '00000000-0000-4000-8000-000000000712';

function hasRedis(): boolean {
  return Boolean(process.env.REDIS_URL);
}

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'invalidation-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

describe('Matter Context Cache — invalidation wired into real mutation routes', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Invalidation Integration Test Tenant A',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
    if (hasRedis()) {
      await getRedisClient()?.flushdb();
    }
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
    __resetRedisClientForTests();
    await closePool();
  });

  async function createMatter(title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, title]
    );
    return rows[0].id;
  }

  test('PATCH /api/matters/[id] invalidates the cache', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter('Original Title');
    await getCachedMatterContext(TENANT_A, matterId); // prime the cache

    const req = new NextRequest(`http://localhost/api/matters/${matterId}`, {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ title: 'Updated Via PATCH' }),
    });
    const res = await patchMatter(req, { params: Promise.resolve({ id: matterId }) });
    expect(res.status).toBe(200);

    const items = await getCachedMatterContext(TENANT_A, matterId);
    expect(items[0].render()).toContain('Updated Via PATCH');
  });

  test('POST /api/matters/[id]/events invalidates the cache', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter('Matter With New Event');
    await getCachedMatterContext(TENANT_A, matterId); // prime the cache — zero chronology entries

    const req = new NextRequest(`http://localhost/api/matters/${matterId}/events`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ event_date: '2026-02-01', description: 'A brand new chronology entry' }),
    });
    const res = await postEvent(req, { params: Promise.resolve({ id: matterId }) });
    expect(res.status).toBe(201);

    const items = await getCachedMatterContext(TENANT_A, matterId);
    const chronologyItem = items.find((i) => i.sourceType === 'CHRONOLOGY_ENTRY');
    expect(chronologyItem?.render()).toContain('A brand new chronology entry');
  });

  test('POST /api/matters/[id]/participants invalidates the cache', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter('Matter With New Participant');
    await getCachedMatterContext(TENANT_A, matterId); // prime the cache — zero participants

    const userRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "User" (tenant_id, email, name) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'newlead@nextcase.local', 'New Lead Counsel']
    );
    const req = new NextRequest(`http://localhost/api/matters/${matterId}/participants`, {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ user_id: userRows[0].id, role: 'LEAD' }),
    });
    const res = await postParticipant(req, { params: Promise.resolve({ id: matterId }) });
    expect(res.status).toBe(201);

    const items = await getCachedMatterContext(TENANT_A, matterId);
    const participantItem = items.find((i) => i.sourceType === 'PARTICIPANT');
    expect(participantItem?.render()).toContain('New Lead Counsel');
  });

  test('POST /api/cases with matter_id invalidates that matter\'s cache', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter('Matter Gaining A Proceeding');
    await getCachedMatterContext(TENANT_A, matterId); // prime the cache — zero proceedings

    const req = new NextRequest('http://localhost/api/cases', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ title: 'Newly Linked Proceeding', country_code: 'IN', matter_id: matterId }),
    });
    const res = await postCase(req);
    expect(res.status).toBe(201);

    const items = await getCachedMatterContext(TENANT_A, matterId);
    const proceedingItem = items.find((i) => i.sourceType === 'PROCEEDING');
    expect(proceedingItem?.render()).toContain('Newly Linked Proceeding');
  });

  test('PATCH /api/cases/[id] invalidates the linked matter\'s cache for a plain field edit', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter('Matter With An Editable Proceeding');
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_A, 'Original Proceeding Title', 'IN', matterId]
    );
    await getCachedMatterContext(TENANT_A, matterId); // prime the cache with the original title

    const req = new NextRequest(`http://localhost/api/cases/${caseRows[0].id}`, {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
      body: JSON.stringify({ status: 'HEARING' }),
    });
    const res = await patchCase(req, { params: Promise.resolve({ id: caseRows[0].id }) });
    expect(res.status).toBe(200);

    const items = await getCachedMatterContext(TENANT_A, matterId);
    const proceedingItem = items.find((i) => i.sourceType === 'PROCEEDING');
    expect(proceedingItem?.render()).toContain('HEARING');
  });

  test('DELETE /api/cases/[id] invalidates the linked matter\'s cache', async () => {
    if (!hasRedis()) return;
    const matterId = await createMatter('Matter Losing A Proceeding');
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_A, 'Proceeding About To Be Deleted', 'IN', matterId]
    );
    await getCachedMatterContext(TENANT_A, matterId); // prime the cache — one proceeding present

    const req = new NextRequest(`http://localhost/api/cases/${caseRows[0].id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader(TENANT_A) },
    });
    const res = await deleteCase(req, { params: Promise.resolve({ id: caseRows[0].id }) });
    expect(res.status).toBe(200);

    const items = await getCachedMatterContext(TENANT_A, matterId);
    expect(items.some((i) => i.sourceType === 'PROCEEDING')).toBe(false);
  });
});
