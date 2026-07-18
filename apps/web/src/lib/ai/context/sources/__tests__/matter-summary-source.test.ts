import { matterSummarySource } from '../matter-summary-source';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-000000000601';
const TENANT_B = '00000000-0000-4000-8000-000000000602';

describe('matterSummarySource', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Matter Summary Source Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Matter Summary Source Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Client" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  test('returns exactly one item with the matter title and status rendered', async () => {
    const rows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title, status) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Advisory on Series B', 'ACTIVE']
    );
    const items = await matterSummarySource.fetch(TENANT_A, rows[0].id);
    expect(items).toHaveLength(1);
    expect(items[0].sourceType).toBe('MATTER_SUMMARY');
    expect(items[0].render()).toContain('Advisory on Series B');
    expect(items[0].render()).toContain('Status: ACTIVE');
  });

  test('includes the joined client name when a client is linked', async () => {
    const clientRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Client" (tenant_id, name) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Acme Corp']
    );
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title, client_id) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Matter for Acme', clientRows[0].id]
    );
    const items = await matterSummarySource.fetch(TENANT_A, matterRows[0].id);
    expect(items[0].render()).toContain('Client: Acme Corp');
  });

  test('returns an empty array for a matter belonging to another tenant (RLS, not a leak)', async () => {
    const rows = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, 'Tenant B Matter']
    );
    const items = await matterSummarySource.fetch(TENANT_A, rows[0].id);
    expect(items).toHaveLength(0);
  });

  test('returns an empty array for a nonexistent matter id', async () => {
    const items = await matterSummarySource.fetch(TENANT_A, '00000000-0000-4000-8000-000000009999');
    expect(items).toHaveLength(0);
  });
});
