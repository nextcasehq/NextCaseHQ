import { DatabaseClient, closePool } from '../db-client';

/**
 * Cross-tenant RLS isolation for the Document Workspace Foundation schema
 * (Sprint 3, PR 3A) — DocumentEnvelope's new matter_id linkage and the new
 * DocumentVersion table — plus the grant-level and constraint-level
 * guarantees the architecture depends on. Mirrors the existing
 * matter-rls.test.ts pattern for the same class of tables.
 */
describe('Document Workspace Foundation — cross-tenant RLS isolation', () => {
  let db: DatabaseClient;
  const TENANT_A = '00000000-0000-4000-8000-0000000000f1';
  const TENANT_B = '00000000-0000-4000-8000-0000000000f2';

  async function seedTenant(tenantId: string) {
    await db.execute(
      tenantId,
      `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [tenantId, `Document Workspace RLS Test Tenant ${tenantId}`]
    );
  }

  // DocumentVersion has no DELETE grant for nextcase_app (append-only —
  // see db/schema.sql) — deleting the parent DocumentEnvelope cascades its
  // versions away instead of deleting them directly, exactly the behavior
  // under test below.
  async function clearAll(tenantId: string) {
    await db.execute(tenantId, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [tenantId]);
    await db.execute(tenantId, `DELETE FROM "Matter" WHERE tenant_id = $1`, [tenantId]);
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

  test('DocumentEnvelope rows linked via matter_id remain isolated per tenant', async () => {
    const matterRowsA = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Matter A']
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title, matter_id) VALUES ($1, $2, $3)`,
      [TENANT_A, 'Document under Matter A', matterRowsA[0].id]
    );
    await db.execute(TENANT_B, `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2)`, [
      TENANT_B,
      'Unrelated Document B',
    ]);

    const resultsA = await db.execute<{ title: string; matter_id: string | null }>(
      TENANT_A,
      `SELECT title, matter_id FROM "DocumentEnvelope"`,
      []
    );
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].matter_id).toBe(matterRowsA[0].id);

    const resultsB = await db.execute<{ title: string; matter_id: string | null }>(
      TENANT_B,
      `SELECT title, matter_id FROM "DocumentEnvelope"`,
      []
    );
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].matter_id).toBeNull();
  });

  test('DocumentVersion rows are isolated per tenant', async () => {
    const docRowsA = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Doc A']
    );
    const docRowsB = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, 'Doc B']
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentVersion" (tenant_id, document_id, version_number, object_key, content_type, size_bytes)
       VALUES ($1, $2, 1, $3, $4, $5)`,
      [TENANT_A, docRowsA[0].id, 'a/key', 'text/plain', 10]
    );
    await db.execute(
      TENANT_B,
      `INSERT INTO "DocumentVersion" (tenant_id, document_id, version_number, object_key, content_type, size_bytes)
       VALUES ($1, $2, 1, $3, $4, $5)`,
      [TENANT_B, docRowsB[0].id, 'b/key', 'text/plain', 20]
    );

    const resultsA = await db.execute<{ object_key: string }>(TENANT_A, `SELECT object_key FROM "DocumentVersion"`, []);
    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].object_key).toBe('a/key');

    const resultsB = await db.execute<{ object_key: string }>(TENANT_B, `SELECT object_key FROM "DocumentVersion"`, []);
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].object_key).toBe('b/key');
  });

  test('the application role cannot UPDATE DocumentVersion rows (append-only by grant, not just convention)', async () => {
    const docRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Immutability Test Doc']
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentVersion" (tenant_id, document_id, version_number, object_key, content_type, size_bytes)
       VALUES ($1, $2, 1, $3, $4, $5)`,
      [TENANT_A, docRows[0].id, 'key', 'text/plain', 10]
    );
    await expect(
      db.execute(TENANT_A, `UPDATE "DocumentVersion" SET size_bytes = 999 WHERE document_id = $1`, [docRows[0].id])
    ).rejects.toThrow(/permission denied for table DocumentVersion/i);
  });

  test('the application role cannot directly DELETE a DocumentVersion row', async () => {
    const docRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Direct Delete Test Doc']
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentVersion" (tenant_id, document_id, version_number, object_key, content_type, size_bytes)
       VALUES ($1, $2, 1, $3, $4, $5)`,
      [TENANT_A, docRows[0].id, 'key', 'text/plain', 10]
    );
    await expect(
      db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE document_id = $1`, [docRows[0].id])
    ).rejects.toThrow(/permission denied for table DocumentVersion/i);
  });

  test('deleting the parent DocumentEnvelope still cascades away its DocumentVersion rows despite the DELETE revoke', async () => {
    const docRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Cascade Test Doc']
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentVersion" (tenant_id, document_id, version_number, object_key, content_type, size_bytes)
       VALUES ($1, $2, 1, $3, $4, $5)`,
      [TENANT_A, docRows[0].id, 'key', 'text/plain', 10]
    );

    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE id = $1`, [docRows[0].id]);

    const remaining = await db.execute<{ id: string }>(
      TENANT_A,
      `SELECT id FROM "DocumentVersion" WHERE document_id = $1`,
      [docRows[0].id]
    );
    expect(remaining).toHaveLength(0);
  });

  test('deleting a Proceeding with a linked Document is rejected at the constraint level (no more silent CASCADE)', async () => {
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Proceeding With Document', 'US']
    );
    await db.execute(TENANT_A, `INSERT INTO "DocumentEnvelope" (tenant_id, title, case_id) VALUES ($1, $2, $3)`, [
      TENANT_A,
      'Filed Document',
      caseRows[0].id,
    ]);

    await expect(db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE id = $1`, [caseRows[0].id])).rejects.toThrow(
      /foreign key constraint/i
    );
  });
});
