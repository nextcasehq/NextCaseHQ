import { proceedingsSource } from '../proceedings-source';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { SOURCE_BASE_WEIGHT } from '../../types';

const TENANT_A = '00000000-0000-4000-8000-000000000611';
const TENANT_B = '00000000-0000-4000-8000-000000000612';

describe('proceedingsSource', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Proceedings Source Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Proceedings Source Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_B]);
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

  test('returns one item per linked LegalCase row, all at the flat PROCEEDING weight', async () => {
    const matterId = await createMatter(TENANT_A);
    await db.execute(TENANT_A, `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4)`, [
      TENANT_A,
      'Writ Petition',
      'IN',
      matterId,
    ]);
    const items = await proceedingsSource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(1);
    expect(items[0].sourceType).toBe('PROCEEDING');
    expect(items[0].weight).toBe(SOURCE_BASE_WEIGHT.PROCEEDING);
    expect(items[0].render()).toContain('Writ Petition');
  });

  test('renders the Proceeding\'s next hearing date when one is set', async () => {
    const matterId = await createMatter(TENANT_A);
    await db.execute(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id, hearing_date) VALUES ($1, $2, $3, $4, $5)`,
      [TENANT_A, 'Writ Petition', 'IN', matterId, '2026-03-15']
    );
    const items = await proceedingsSource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(1);
    expect(items[0].render()).toContain('next hearing 2026-03-15');
  });

  test('omits "next hearing" when the Proceeding has no hearing_date', async () => {
    const matterId = await createMatter(TENANT_A);
    await db.execute(TENANT_A, `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4)`, [
      TENANT_A,
      'Writ Petition',
      'IN',
      matterId,
    ]);
    const items = await proceedingsSource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(1);
    expect(items[0].render()).not.toContain('next hearing');
  });

  test('returns an empty array for a matter with no linked proceedings — a valid, honest state', async () => {
    const matterId = await createMatter(TENANT_A);
    const items = await proceedingsSource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(0);
  });

  test('does not see proceedings linked to another tenant\'s matter', async () => {
    const matterId = await createMatter(TENANT_B);
    await db.execute(TENANT_B, `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4)`, [
      TENANT_B,
      'Tenant B Proceeding',
      'IN',
      matterId,
    ]);
    const items = await proceedingsSource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(0);
  });
});
