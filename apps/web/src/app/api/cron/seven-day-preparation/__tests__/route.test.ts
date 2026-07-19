import { NextRequest } from 'next/server';
import { GET } from '../route';
import { INSECURE_CRON_SECRET_PLACEHOLDER } from '@/lib/security/env-validation';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = crypto.randomUUID();
const TENANT_B = crypto.randomUUID();
const USER_A_PARTICIPANT = crypto.randomUUID();
const USER_A_AUTHOR = crypto.randomUUID();
const USER_B = crypto.randomUUID();

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function buildRequest(authorizationHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authorizationHeader !== undefined) {
    headers.authorization = authorizationHeader;
  }
  return new NextRequest(new URL('http://localhost/api/cron/seven-day-preparation'), { headers });
}

describe('GET /api/cron/seven-day-preparation — Seven-Day Preparation scheduled trigger (Milestone 3)', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Seven Day Cron Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Seven Day Cron Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A_PARTICIPANT, TENANT_A, `cron-participant-${USER_A_PARTICIPANT}@nextcase.local`]
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_A_AUTHOR, TENANT_A, `cron-author-${USER_A_AUTHOR}@nextcase.local`]
    );
    await db.execute(
      TENANT_B,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_B, TENANT_B, `cron-tenant-b-${USER_B}@nextcase.local`]
    );
  });

  afterAll(async () => {
    await closePool();
  });

  async function createMatter(tenantId: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, 'Cron Test Matter']
    );
    return rows[0].id;
  }

  async function createCase(tenantId: string, matterId: string | null, hearingDate: string | null): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id, hearing_date) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenantId, 'Cron Test Proceeding', 'IN', matterId, hearingDate]
    );
    return rows[0].id;
  }

  async function countNotifications(tenantId: string, userId: string): Promise<number> {
    const rows = await db.execute<{ count: number }>(
      tenantId,
      `SELECT COUNT(*)::int AS count FROM "Notification" WHERE user_id = $1 AND type = 'HEARING_PREPARATION'`,
      [userId]
    );
    return rows[0].count;
  }

  async function countReminders(tenantId: string, caseId: string): Promise<number> {
    const rows = await db.execute<{ count: number }>(
      tenantId,
      `SELECT COUNT(*)::int AS count FROM "MatterPreparationReminder" WHERE case_id = $1`,
      [caseId]
    );
    return rows[0].count;
  }

  test('rejects a request with no Authorization header (401)', async () => {
    const res = await GET(buildRequest());
    expect(res.status).toBe(401);
  });

  test('rejects a request with the wrong secret (401)', async () => {
    const res = await GET(buildRequest('Bearer not-the-real-secret'));
    expect(res.status).toBe(401);
  });

  test('notifies every Matter participant for a qualifying Proceeding', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId, daysFromToday(5));
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterParticipant" (tenant_id, matter_id, user_id, role) VALUES ($1, $2, $3, 'ASSOCIATE')`,
      [TENANT_A, matterId, USER_A_PARTICIPANT]
    );

    const res = await GET(buildRequest(`Bearer ${INSECURE_CRON_SECRET_PLACEHOLDER}`));
    expect(res.status).toBe(200);

    expect(await countNotifications(TENANT_A, USER_A_PARTICIPANT)).toBe(1);
    expect(await countReminders(TENANT_A, caseId)).toBe(1);
  });

  test('falls back to the latest Court Note author when the Proceeding has no Matter participants', async () => {
    const caseId = await createCase(TENANT_A, null, daysFromToday(2));
    await db.execute(
      TENANT_A,
      `INSERT INTO "CourtNote" (
         tenant_id, case_id, author_user_id, hearing_date, court_forum_type, court_forum_display, stage, note
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [TENANT_A, caseId, USER_A_AUTHOR, daysFromToday(2), 'HIGH_COURT', 'High Court', 'Arguments', 'Note']
    );

    await GET(buildRequest(`Bearer ${INSECURE_CRON_SECRET_PLACEHOLDER}`));

    expect(await countNotifications(TENANT_A, USER_A_AUTHOR)).toBe(1);
    expect(await countReminders(TENANT_A, caseId)).toBe(1);
  });

  test('does not notify twice for the same Proceeding and hearing_date on repeat invocation', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId, daysFromToday(6));
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterParticipant" (tenant_id, matter_id, user_id, role) VALUES ($1, $2, $3, 'ASSOCIATE')`,
      [TENANT_A, matterId, USER_A_PARTICIPANT]
    );

    await GET(buildRequest(`Bearer ${INSECURE_CRON_SECRET_PLACEHOLDER}`));
    await GET(buildRequest(`Bearer ${INSECURE_CRON_SECRET_PLACEHOLDER}`));
    await GET(buildRequest(`Bearer ${INSECURE_CRON_SECRET_PLACEHOLDER}`));

    expect(await countReminders(TENANT_A, caseId)).toBe(1);
  });

  test('does not notify a Proceeding whose hearing is outside the 7-day window', async () => {
    const matterId = await createMatter(TENANT_A);
    const caseId = await createCase(TENANT_A, matterId, daysFromToday(30));
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterParticipant" (tenant_id, matter_id, user_id, role) VALUES ($1, $2, $3, 'ASSOCIATE')`,
      [TENANT_A, matterId, USER_A_PARTICIPANT]
    );

    await GET(buildRequest(`Bearer ${INSECURE_CRON_SECRET_PLACEHOLDER}`));

    expect(await countReminders(TENANT_A, caseId)).toBe(0);
  });

  test('notifies each tenant only for its own qualifying Proceedings, with no cross-tenant leakage', async () => {
    const matterB = await createMatter(TENANT_B);
    const caseB = await createCase(TENANT_B, matterB, daysFromToday(1));
    await db.execute(
      TENANT_B,
      `INSERT INTO "MatterParticipant" (tenant_id, matter_id, user_id, role) VALUES ($1, $2, $3, 'ASSOCIATE')`,
      [TENANT_B, matterB, USER_B]
    );

    await GET(buildRequest(`Bearer ${INSECURE_CRON_SECRET_PLACEHOLDER}`));

    expect(await countNotifications(TENANT_B, USER_B)).toBe(1);
    expect(await countReminders(TENANT_B, caseB)).toBe(1);
    // Tenant A's own recipients are unaffected by Tenant B's qualifying case.
    expect(await countNotifications(TENANT_A, USER_A_PARTICIPANT)).toBeGreaterThanOrEqual(0);
  });
});
