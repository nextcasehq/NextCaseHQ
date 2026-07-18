import { DatabaseClient, closePool } from '../db-client';

describe('High-Priority Verification: Cross-Tenant RLS Isolation — Matter Workspace tables', () => {
  let db: DatabaseClient;
  const TENANT_A = '00000000-0000-4000-8000-0000000000d1';
  const TENANT_B = '00000000-0000-4000-8000-0000000000d2';
  const USER_A = '00000000-0000-4000-8000-0000000000d3';

  async function seedTenant(tenantId: string) {
    await db.execute(
      tenantId,
      `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [tenantId, `Matter RLS Test Tenant ${tenantId}`]
    );
  }

  async function clearAll(tenantId: string) {
    await db.execute(tenantId, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "Matter" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "Client" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "User" WHERE tenant_id = $1`, [tenantId]);
  }

  beforeAll(async () => {
    db = new DatabaseClient();
    await seedTenant(TENANT_A);
    await seedTenant(TENANT_B);
  });

  beforeEach(async () => {
    await clearAll(TENANT_A);
    await clearAll(TENANT_B);
  });

  afterAll(async () => {
    await clearAll(TENANT_A);
    await clearAll(TENANT_B);
    await closePool();
  });

  test('Client rows are isolated per tenant', async () => {
    await db.execute(TENANT_A, `INSERT INTO "Client" (tenant_id, name) VALUES ($1, $2)`, [TENANT_A, 'Client A']);
    await db.execute(TENANT_B, `INSERT INTO "Client" (tenant_id, name) VALUES ($1, $2)`, [TENANT_B, 'Client B']);

    const resultsA = await db.execute(TENANT_A, `SELECT name FROM "Client"`, []);
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].name).toBe('Client A');

    const resultsB = await db.execute(TENANT_B, `SELECT name FROM "Client"`, []);
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].name).toBe('Client B');
  });

  test('Matter rows are isolated per tenant', async () => {
    await db.execute(TENANT_A, `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2)`, [TENANT_A, 'Matter A']);
    await db.execute(TENANT_B, `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2)`, [TENANT_B, 'Matter B']);

    const resultsA = await db.execute(TENANT_A, `SELECT title FROM "Matter"`, []);
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].title).toBe('Matter A');
    expect(resultsA.some((r) => r.title === 'Matter B')).toBe(false);

    const resultsB = await db.execute(TENANT_B, `SELECT title FROM "Matter"`, []);
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].title).toBe('Matter B');
  });

  test('MatterParticipant rows are isolated per tenant', async () => {
    await db.execute(TENANT_A, `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3)`, [
      USER_A,
      TENANT_A,
      'matter-rls-test@nextcase.local',
    ]);
    const matterRowsA = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Matter A']
    );
    const matterRowsB = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, 'Matter B']
    );

    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterParticipant" (tenant_id, matter_id, user_id, role) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, matterRowsA[0].id, USER_A, 'LEAD']
    );

    const resultsA = await db.execute(TENANT_A, `SELECT matter_id FROM "MatterParticipant"`, []);
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].matter_id).toBe(matterRowsA[0].id);

    const resultsB = await db.execute(TENANT_B, `SELECT matter_id FROM "MatterParticipant"`, []);
    expect(resultsB).toHaveLength(0);
    expect(matterRowsB[0].id).toBeDefined();
  });

  test('MatterEvent rows are isolated per tenant', async () => {
    const matterRowsA = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Matter A']
    );
    const matterRowsB = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, 'Matter B']
    );

    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, matterRowsA[0].id, '2026-01-15', 'Filed notice']
    );
    await db.execute(
      TENANT_B,
      `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description) VALUES ($1, $2, $3, $4)`,
      [TENANT_B, matterRowsB[0].id, '2026-01-16', 'Served summons']
    );

    const resultsA = await db.execute(TENANT_A, `SELECT description FROM "MatterEvent"`, []);
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].description).toBe('Filed notice');

    const resultsB = await db.execute(TENANT_B, `SELECT description FROM "MatterEvent"`, []);
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].description).toBe('Served summons');
  });

  test('LegalCase rows linked via matter_id remain isolated per tenant', async () => {
    const matterRowsA = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Matter A']
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, 'Proceeding under Matter A', 'IN', matterRowsA[0].id]
    );
    await db.execute(
      TENANT_B,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3)`,
      [TENANT_B, 'Unrelated Proceeding B', 'IN']
    );

    const resultsA = await db.execute(TENANT_A, `SELECT title, matter_id FROM "LegalCase"`, []);
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].matter_id).toBe(matterRowsA[0].id);

    const resultsB = await db.execute(TENANT_B, `SELECT title, matter_id FROM "LegalCase"`, []);
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].matter_id).toBeNull();
  });
});
