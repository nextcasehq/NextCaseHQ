import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { getMatterContext, renderContext, MatterNotFoundError, EntitlementDeniedError } from '../gateway';
import { getCachedMatterContext } from '../cache';
import { enforceEntitlement } from '../../entitlement';
import type { ContextItem } from '../types';

jest.mock('../cache');
jest.mock('../../entitlement');

const mockedGetCachedMatterContext = getCachedMatterContext as jest.MockedFunction<typeof getCachedMatterContext>;
const mockedEnforceEntitlement = enforceEntitlement as jest.MockedFunction<typeof enforceEntitlement>;

function fakeItem(sourceType: ContextItem['sourceType'], weight: number, text: string): ContextItem {
  return { sourceType, weight, render: () => text };
}

describe('getMatterContext (AI Context Gateway)', () => {
  const db = new DatabaseClient();
  const TENANT_ID = '00000000-0000-4000-8000-000000000cf1';
  const TENANT_B = '00000000-0000-4000-8000-000000000cf2';
  const USER_ID = '00000000-0000-4000-8000-000000000cf3';

  beforeAll(async () => {
    await db.execute(TENANT_ID, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_ID,
      'Gateway Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Gateway Test Tenant B',
    ]);
  });

  afterAll(async () => {
    await closePool();
  });

  beforeEach(() => {
    mockedGetCachedMatterContext.mockReset();
    mockedEnforceEntitlement.mockReset();
    mockedEnforceEntitlement.mockResolvedValue({ allowed: true });
  });

  async function createMatter(tenantId: string, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, title]
    );
    return rows[0].id;
  }

  test('same-tenant matterId succeeds and returns ranked items', async () => {
    const matterId = await createMatter(TENANT_ID, 'Gateway Success Matter');
    mockedGetCachedMatterContext.mockResolvedValue([
      fakeItem('MATTER_SUMMARY', 100, 'summary'),
      fakeItem('PARTICIPANT', 40, 'participant'),
    ]);

    const result = await getMatterContext(TENANT_ID, USER_ID, matterId, { operationType: 'AI_CHAT' });

    expect(result.truncated).toBe(false);
    expect(result.items.map((i) => i.sourceType)).toEqual(['MATTER_SUMMARY', 'PARTICIPANT']);
    expect(mockedGetCachedMatterContext).toHaveBeenCalledWith(TENANT_ID, matterId);
  });

  test('a nonexistent matterId throws MatterNotFoundError before touching the cache or entitlement', async () => {
    mockedGetCachedMatterContext.mockResolvedValue([]);
    await expect(
      getMatterContext(TENANT_ID, USER_ID, '00000000-0000-4000-8000-00000000dead', { operationType: 'AI_CHAT' })
    ).rejects.toBeInstanceOf(MatterNotFoundError);
    expect(mockedEnforceEntitlement).not.toHaveBeenCalled();
    expect(mockedGetCachedMatterContext).not.toHaveBeenCalled();
  });

  test('a cross-tenant matterId fails closed with MatterNotFoundError, indistinguishable from nonexistent', async () => {
    const otherTenantMatterId = await createMatter(TENANT_B, 'Gateway Cross-Tenant Matter');
    mockedGetCachedMatterContext.mockResolvedValue([]);

    await expect(
      getMatterContext(TENANT_ID, USER_ID, otherTenantMatterId, { operationType: 'AI_CHAT' })
    ).rejects.toBeInstanceOf(MatterNotFoundError);
    expect(mockedEnforceEntitlement).not.toHaveBeenCalled();
  });

  test('enforceEntitlement is called on every successful path, with the tenant/user/operationType given', async () => {
    const matterId = await createMatter(TENANT_ID, 'Gateway Entitlement Call Matter');
    mockedGetCachedMatterContext.mockResolvedValue([]);

    await getMatterContext(TENANT_ID, USER_ID, matterId, { operationType: 'LEGAL_RESEARCH' });

    expect(mockedEnforceEntitlement).toHaveBeenCalledWith(TENANT_ID, USER_ID, 'LEGAL_RESEARCH');
  });

  test('a forced entitlement denial throws EntitlementDeniedError and never reaches the context builder', async () => {
    const matterId = await createMatter(TENANT_ID, 'Gateway Denied Matter');
    mockedEnforceEntitlement.mockResolvedValue({ allowed: false, reason: 'Trial expired.' });

    const error = await getMatterContext(TENANT_ID, USER_ID, matterId, { operationType: 'AI_CHAT' }).catch(
      (e) => e
    );
    expect(error).toBeInstanceOf(EntitlementDeniedError);
    expect((error as EntitlementDeniedError).reason).toBe('Trial expired.');
    expect(mockedGetCachedMatterContext).not.toHaveBeenCalled();
  });

  test('sourceCounts reflects the unranked item set, not the post-budget/truncated result', async () => {
    const matterId = await createMatter(TENANT_ID, 'Gateway SourceCounts Matter');
    mockedGetCachedMatterContext.mockResolvedValue([
      fakeItem('CHRONOLOGY_ENTRY', 70, 'a'),
      fakeItem('CHRONOLOGY_ENTRY', 69, 'b'),
      fakeItem('PARTICIPANT', 40, 'c'),
    ]);

    const result = await getMatterContext(TENANT_ID, USER_ID, matterId, {
      operationType: 'AI_CHAT',
      budget: { maxItems: 1 },
    });

    expect(result.truncated).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.sourceCounts).toEqual({ CHRONOLOGY_ENTRY: 2, PARTICIPANT: 1 });
  });
});

describe('renderContext', () => {
  test('joins each item render() with a newline, in list order', () => {
    const items: ContextItem[] = [fakeItem('MATTER_SUMMARY', 100, 'first'), fakeItem('PARTICIPANT', 40, 'second')];
    expect(renderContext(items)).toBe('first\nsecond');
  });

  test('returns an empty string for an empty item list', () => {
    expect(renderContext([])).toBe('');
  });
});
