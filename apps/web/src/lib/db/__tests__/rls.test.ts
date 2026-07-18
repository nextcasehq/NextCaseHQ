import { DatabaseClient, closePool } from '../db-client';

describe('High-Priority Verification: Cross-Tenant RLS Isolation', () => {
  let db: DatabaseClient;
  const TENANT_A = '00000000-0000-4000-8000-00000000000a';
  const TENANT_B = '00000000-0000-4000-8000-00000000000b';

  async function seedTenant(tenantId: string) {
    await db.execute(
      tenantId,
      `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [tenantId, `Test Tenant ${tenantId}`]
    );
  }

  async function clearCases(tenantId: string) {
    await db.execute(tenantId, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [tenantId]);
  }

  beforeAll(async () => {
    db = new DatabaseClient();
    await seedTenant(TENANT_A);
    await seedTenant(TENANT_B);
  });

  beforeEach(async () => {
    await clearCases(TENANT_A);
    await clearCases(TENANT_B);
  });

  afterAll(async () => {
    await clearCases(TENANT_A);
    await clearCases(TENANT_B);
    await closePool();
  });

  test('Absolute RLS Isolation between Tenant_A and Tenant_B', async () => {
    // 1. DATA INJECTION: Insert a case for each tenant.
    await db.execute(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3)`,
      [TENANT_A, 'Private A', 'IN']
    );
    await db.execute(
      TENANT_B,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3)`,
      [TENANT_B, 'Private B', 'IN']
    );

    // 2. ISOLATION AUDIT: Tenant_A reads with no tenant_id filter in the SQL
    // itself — Postgres RLS, not application code, must do the filtering.
    const tenantAResults = await db.execute(TENANT_A, `SELECT id, tenant_id, title FROM "LegalCase"`, []);
    expect(tenantAResults).toHaveLength(1);
    expect(tenantAResults[0].title).toBe('Private A');
    expect(tenantAResults.some((r) => r.title === 'Private B')).toBe(false);

    // 3. ISOLATION AUDIT: Tenant_B reads
    const tenantBResults = await db.execute(TENANT_B, `SELECT id, tenant_id, title FROM "LegalCase"`, []);
    expect(tenantBResults).toHaveLength(1);
    expect(tenantBResults[0].title).toBe('Private B');
    expect(tenantBResults.some((r) => r.title === 'Private A')).toBe(false);

    console.log('[AUDIT] RLS Isolation Verified: 100% data separation.');
  });
});
