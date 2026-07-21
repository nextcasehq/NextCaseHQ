import { chronologySource } from '../chronology-source';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { SOURCE_BASE_WEIGHT } from '../../types';

const TENANT_A = '00000000-0000-4000-8000-000000000631';
const TENANT_B = '00000000-0000-4000-8000-000000000632';

describe('chronologySource', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Chronology Source Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Chronology Source Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "MatterEvent" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  async function createMatter(tenantId: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, 'Test Matter']
    );
    return rows[0].id;
  }

  test('the single most recent entry keeps the full base weight', async () => {
    const matterId = await createMatter(TENANT_A);
    await db.execute(TENANT_A, `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description) VALUES ($1, $2, $3, $4)`, [
      TENANT_A,
      matterId,
      '2026-01-15',
      'Filed notice',
    ]);
    const items = await chronologySource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(1);
    expect(items[0].sourceType).toBe('CHRONOLOGY_ENTRY');
    expect(items[0].weight).toBe(SOURCE_BASE_WEIGHT.CHRONOLOGY_ENTRY);
  });

  test('older entries decay in weight relative to the most recent one, never below the floor', async () => {
    const matterId = await createMatter(TENANT_A);
    const dates = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01', '2026-05-01'];
    for (const date of dates) {
      await db.execute(TENANT_A, `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description) VALUES ($1, $2, $3, $4)`, [
        TENANT_A,
        matterId,
        date,
        `Event on ${date}`,
      ]);
    }
    const items = await chronologySource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(5);
    // Rows arrive newest-first (event_date DESC): 05-01, 04-01, 03-01, 02-01, 01-01.
    expect(items[0].recency).toBe('2026-05-01');
    expect(items[0].weight).toBe(SOURCE_BASE_WEIGHT.CHRONOLOGY_ENTRY);

    // Weight strictly decreases (or stays at the floor) as entries get older.
    for (let i = 1; i < items.length; i++) {
      expect(items[i].weight).toBeLessThanOrEqual(items[i - 1].weight);
    }
    // Every weight stays at or above a sane floor rather than going negative
    // or to zero for a long-running matter's oldest entries.
    for (const item of items) {
      expect(item.weight).toBeGreaterThanOrEqual(15);
    }
  });

  test('returns an empty array for a matter with no chronology entries', async () => {
    const matterId = await createMatter(TENANT_A);
    const items = await chronologySource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(0);
  });

  test('does not see chronology entries on another tenant\'s matter', async () => {
    const matterId = await createMatter(TENANT_B);
    await db.execute(TENANT_B, `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description) VALUES ($1, $2, $3, $4)`, [
      TENANT_B,
      matterId,
      '2026-01-01',
      'Tenant B event',
    ]);
    const items = await chronologySource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(0);
  });
});
