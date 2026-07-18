import { participantsSource } from '../participants-source';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { SOURCE_BASE_WEIGHT } from '../../types';

const TENANT_A = '00000000-0000-4000-8000-000000000621';
const TENANT_B = '00000000-0000-4000-8000-000000000622';

describe('participantsSource', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Participants Source Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Participants Source Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    await db.execute(TENANT_A, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_B]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "MatterParticipant" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE tenant_id = $1`, [TENANT_A]);
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

  test('returns one item per participant, rendered with name and role', async () => {
    const matterId = await createMatter(TENANT_A);
    const userRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "User" (tenant_id, email, name) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'lead@nextcase.local', 'Senior Counsel']
    );
    await db.execute(TENANT_A, `INSERT INTO "MatterParticipant" (tenant_id, matter_id, user_id, role) VALUES ($1, $2, $3, $4)`, [
      TENANT_A,
      matterId,
      userRows[0].id,
      'LEAD',
    ]);
    const items = await participantsSource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(1);
    expect(items[0].sourceType).toBe('PARTICIPANT');
    expect(items[0].weight).toBe(SOURCE_BASE_WEIGHT.PARTICIPANT);
    expect(items[0].render()).toBe('- Senior Counsel (LEAD)');
  });

  test('falls back to email when the user has no name set', async () => {
    const matterId = await createMatter(TENANT_A);
    const userRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "User" (tenant_id, email) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'noname@nextcase.local']
    );
    await db.execute(TENANT_A, `INSERT INTO "MatterParticipant" (tenant_id, matter_id, user_id, role) VALUES ($1, $2, $3, $4)`, [
      TENANT_A,
      matterId,
      userRows[0].id,
      'VIEWER',
    ]);
    const items = await participantsSource.fetch(TENANT_A, matterId);
    expect(items[0].render()).toBe('- noname@nextcase.local (VIEWER)');
  });

  test('returns an empty array for a matter with no participants', async () => {
    const matterId = await createMatter(TENANT_A);
    const items = await participantsSource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(0);
  });

  test('does not see participants on another tenant\'s matter', async () => {
    const matterId = await createMatter(TENANT_B);
    const items = await participantsSource.fetch(TENANT_A, matterId);
    expect(items).toHaveLength(0);
  });
});
