import { buildMatterContext } from '../builder';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000641';
const TENANT_B = '00000000-0000-4000-8000-000000000642';

describe('buildMatterContext', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Context Builder Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Context Builder Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
    await closePool();
  });

  test('aggregates items from all four sources for a fully-populated matter', async () => {
    const clientRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Client" (tenant_id, name) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Acme Corp']
    );
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title, client_id) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Full Matter', clientRows[0].id]
    );
    const matterId = matterRows[0].id;

    await db.execute(TENANT_A, `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4)`, [
      TENANT_A,
      'Linked Proceeding',
      'IN',
      matterId,
    ]);
    const userRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "User" (tenant_id, email, name) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'lead@nextcase.local', 'Lead Counsel']
    );
    await db.execute(TENANT_A, `INSERT INTO "MatterParticipant" (tenant_id, matter_id, user_id, role) VALUES ($1, $2, $3, $4)`, [
      TENANT_A,
      matterId,
      userRows[0].id,
      'LEAD',
    ]);
    await db.execute(TENANT_A, `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description) VALUES ($1, $2, $3, $4)`, [
      TENANT_A,
      matterId,
      '2026-01-15',
      'Filed notice',
    ]);

    const items = await buildMatterContext(TENANT_A, matterId);
    const sourceTypes = items.map((i) => i.sourceType).sort();
    expect(sourceTypes).toEqual(['CHRONOLOGY_ENTRY', 'MATTER_SUMMARY', 'PARTICIPANT', 'PROCEEDING']);

    const summary = items.find((i) => i.sourceType === 'MATTER_SUMMARY');
    expect(summary?.render()).toContain('Full Matter');
    expect(summary?.render()).toContain('Acme Corp');
  });

  test('an advisory matter with zero Proceedings still produces a summary — a valid, honest state', async () => {
    const rows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title, engagement_type) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Pure Advisory Matter', 'ADVISORY']
    );
    const items = await buildMatterContext(TENANT_A, rows[0].id);
    expect(items).toHaveLength(1);
    expect(items[0].sourceType).toBe('MATTER_SUMMARY');
  });

  test('a nonexistent-in-this-tenant matter produces zero items from every source', async () => {
    const rows = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, 'Tenant B Matter']
    );
    const items = await buildMatterContext(TENANT_A, rows[0].id);
    expect(items).toHaveLength(0);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE id = $1`, [rows[0].id]);
  });
});
