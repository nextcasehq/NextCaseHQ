import { DatabaseClient, closePool } from '../db-client';

describe('High-Priority Verification: Cross-Tenant RLS Isolation — Production Matter Register tables', () => {
  let db: DatabaseClient;
  const TENANT_A = '00000000-0000-4000-8000-000000000061';
  const TENANT_B = '00000000-0000-4000-8000-000000000062';
  const USER_A = '00000000-0000-4000-8000-000000000063';

  async function seedTenant(tenantId: string) {
    await db.execute(
      tenantId,
      `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [tenantId, `Matter Register RLS Test Tenant ${tenantId}`]
    );
  }

  async function clearAll(tenantId: string) {
    // MatterAuditEvent, MatterReopeningRecord, and MatterClosureRecord are
    // append-only — nextcase_app has no DELETE grant on them at all (same
    // real database restriction CourtNote already has, see db/schema.sql).
    // Like the CourtNote test suite, this cleanup never attempts to delete
    // them; each test below scopes its own assertions instead.
    await db.execute(tenantId, `DELETE FROM "MatterRepresentation" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "MatterResearchAuthority" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "EarlierCaseReference" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "MatterParty" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "MatterTask" WHERE tenant_id = $1`, [tenantId]);
    // CourtNote is append-only too, but this suite never inserts one, so
    // there is nothing to (and nothing we could) clean up here.
    await db.execute(tenantId, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "Matter" WHERE tenant_id = $1`, [tenantId]);
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

  async function seedMatter(tenantId: string, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, title]
    );
    return rows[0].id;
  }

  test('MatterParty rows are isolated per tenant', async () => {
    const matterA = await seedMatter(TENANT_A, 'Matter A');
    const matterB = await seedMatter(TENANT_B, 'Matter B');
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterParty" (tenant_id, matter_id, display_name, procedural_role) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, matterA, 'Party A', 'PLAINTIFF']
    );
    await db.execute(
      TENANT_B,
      `INSERT INTO "MatterParty" (tenant_id, matter_id, display_name, procedural_role) VALUES ($1, $2, $3, $4)`,
      [TENANT_B, matterB, 'Party B', 'DEFENDANT']
    );

    const resultsA = await db.execute(TENANT_A, `SELECT display_name FROM "MatterParty"`, []);
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].display_name).toBe('Party A');

    const resultsB = await db.execute(TENANT_B, `SELECT display_name FROM "MatterParty"`, []);
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].display_name).toBe('Party B');
  });

  test('EarlierCaseReference rows are isolated per tenant', async () => {
    const matterA = await seedMatter(TENANT_A, 'Matter A');
    await db.execute(
      TENANT_A,
      `INSERT INTO "EarlierCaseReference" (tenant_id, matter_id, reference_type, reference_number) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, matterA, 'APPEAL', 'REF-A']
    );
    const matterB = await seedMatter(TENANT_B, 'Matter B');
    await db.execute(
      TENANT_B,
      `INSERT INTO "EarlierCaseReference" (tenant_id, matter_id, reference_type, reference_number) VALUES ($1, $2, $3, $4)`,
      [TENANT_B, matterB, 'REVISION', 'REF-B']
    );

    const resultsA = await db.execute(TENANT_A, `SELECT reference_number FROM "EarlierCaseReference"`, []);
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].reference_number).toBe('REF-A');

    const resultsB = await db.execute(TENANT_B, `SELECT reference_number FROM "EarlierCaseReference"`, []);
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].reference_number).toBe('REF-B');
  });

  test('MatterResearchAuthority rows are isolated per tenant', async () => {
    const matterA = await seedMatter(TENANT_A, 'Matter A');
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterResearchAuthority" (tenant_id, matter_id, case_title) VALUES ($1, $2, $3)`,
      [TENANT_A, matterA, 'Authority A']
    );

    const resultsA = await db.execute(TENANT_A, `SELECT case_title FROM "MatterResearchAuthority"`, []);
    expect(resultsA).toHaveLength(1);

    const resultsB = await db.execute(TENANT_B, `SELECT case_title FROM "MatterResearchAuthority"`, []);
    expect(resultsB).toHaveLength(0);
  });

  test('MatterRepresentation rows are isolated per tenant', async () => {
    await db.execute(TENANT_A, `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3)`, [
      USER_A,
      TENANT_A,
      'matter-register-rls-test@nextcase.local',
    ]);
    const matterA = await seedMatter(TENANT_A, 'Matter A');
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterRepresentation" (tenant_id, matter_id, user_id, representation_role) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, matterA, USER_A, 'LEAD_ADVOCATE']
    );

    const resultsA = await db.execute(TENANT_A, `SELECT representation_role FROM "MatterRepresentation"`, []);
    expect(resultsA).toHaveLength(1);

    const resultsB = await db.execute(TENANT_B, `SELECT representation_role FROM "MatterRepresentation"`, []);
    expect(resultsB).toHaveLength(0);
  });

  test('MatterClosureRecord, MatterReopeningRecord, and MatterAuditEvent rows are isolated per tenant', async () => {
    await db.execute(TENANT_A, `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3)`, [
      USER_A,
      TENANT_A,
      'matter-register-rls-closure-test@nextcase.local',
    ]);
    const matterA = await seedMatter(TENANT_A, 'Matter A');

    const closureRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "MatterClosureRecord"
         (tenant_id, matter_id, closure_reason, confirming_advocate_id, confirmation_statement)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [TENANT_A, matterA, 'MATTER_DISPOSED', USER_A, 'confirmed']
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterReopeningRecord" (tenant_id, matter_id, closure_record_id, reopening_reason, advocate_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [TENANT_A, matterA, closureRows[0].id, 'RESTORATION', USER_A]
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "MatterAuditEvent" (tenant_id, matter_id, actor_user_id, action) VALUES ($1, $2, $3, $4)`,
      [TENANT_A, matterA, USER_A, 'MATTER_CLOSED']
    );

    expect(await db.execute(TENANT_A, `SELECT id FROM "MatterClosureRecord"`, [])).toHaveLength(1);
    expect(await db.execute(TENANT_B, `SELECT id FROM "MatterClosureRecord"`, [])).toHaveLength(0);
    expect(await db.execute(TENANT_A, `SELECT id FROM "MatterReopeningRecord"`, [])).toHaveLength(1);
    expect(await db.execute(TENANT_B, `SELECT id FROM "MatterReopeningRecord"`, [])).toHaveLength(0);
    expect(await db.execute(TENANT_A, `SELECT id FROM "MatterAuditEvent"`, [])).toHaveLength(1);
    expect(await db.execute(TENANT_B, `SELECT id FROM "MatterAuditEvent"`, [])).toHaveLength(0);
  });

  test('a Matter with a wider status vocabulary (DRAFT, HEARING_SOON, ...) still enforces tenant isolation', async () => {
    const matterId = await seedMatter(TENANT_A, 'Draft Matter A');
    await db.execute(TENANT_A, `UPDATE "Matter" SET status = 'DRAFT' WHERE id = $1`, [matterId]);

    const resultsA = await db.execute(TENANT_A, `SELECT status FROM "Matter" WHERE id = $1`, [matterId]);
    expect(resultsA[0].status).toBe('DRAFT');

    const resultsB = await db.execute(TENANT_B, `SELECT status FROM "Matter" WHERE id = $1`, [matterId]);
    expect(resultsB).toHaveLength(0);
  });
});
