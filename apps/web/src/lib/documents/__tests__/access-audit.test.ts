import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { recordDocumentAccessEvent, extractCorrelationId } from '../access-audit';

/**
 * DocumentAccessEvent is an append-only ledger (nextcase_app has no
 * UPDATE/DELETE grant on it — see db/schema.sql). These tests never
 * attempt to clean up rows they insert; instead they use fixed, dedicated
 * tenant/user ids and assert via before/after count deltas, the same
 * pattern already established for AiUsageEvent.
 */
describe('recordDocumentAccessEvent', () => {
  const db = new DatabaseClient();
  const TENANT_A = '00000000-0000-4000-8000-000000000901';
  const TENANT_B = '00000000-0000-4000-8000-000000000902';
  const USER_ID = '00000000-0000-4000-8000-000000000903';

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Document Access Audit Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Document Access Audit Test Tenant B',
    ]);
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'access-audit-test@nextcase.local']
    );
  });

  afterAll(async () => {
    await closePool();
  });

  async function eventCount(tenantId: string): Promise<number> {
    const rows = await db.execute<{ count: number }>(
      tenantId,
      `SELECT COUNT(*)::int AS count FROM "DocumentAccessEvent" WHERE tenant_id = $1`,
      [tenantId]
    );
    return rows[0].count;
  }

  test('records a PREVIEW event with the given fields, storing no document content', async () => {
    const before = await eventCount(TENANT_A);
    const envelopeId = crypto.randomUUID();
    const versionId = crypto.randomUUID();

    await recordDocumentAccessEvent({
      tenantId: TENANT_A,
      userId: USER_ID,
      envelopeId,
      versionId,
      versionNumber: 2,
      action: 'PREVIEW',
      correlationId: 'req-abc-123',
    });

    const after = await eventCount(TENANT_A);
    expect(after).toBe(before + 1);

    const rows = await db.execute<{
      tenant_id: string;
      user_id: string;
      envelope_id: string;
      version_id: string;
      version_number: number;
      action: string;
      correlation_id: string;
    }>(
      TENANT_A,
      `SELECT tenant_id, user_id, envelope_id, version_id, version_number, action, correlation_id
       FROM "DocumentAccessEvent" WHERE envelope_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [envelopeId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tenant_id).toBe(TENANT_A);
    expect(rows[0].user_id).toBe(USER_ID);
    expect(rows[0].envelope_id).toBe(envelopeId);
    expect(rows[0].version_id).toBe(versionId);
    expect(rows[0].version_number).toBe(2);
    expect(rows[0].action).toBe('PREVIEW');
    expect(rows[0].correlation_id).toBe('req-abc-123');
    // Only ids/action/timestamp/correlation are ever recorded — no column
    // on this table can hold file contents or extracted text at all.
    expect(Object.keys(rows[0]).sort()).toEqual(
      ['action', 'correlation_id', 'envelope_id', 'tenant_id', 'user_id', 'version_id', 'version_number'].sort()
    );
  });

  test('records a DOWNLOAD event without a correlation id when none was supplied', async () => {
    const envelopeId = crypto.randomUUID();
    await recordDocumentAccessEvent({
      tenantId: TENANT_A,
      userId: USER_ID,
      envelopeId,
      action: 'DOWNLOAD',
    });

    const rows = await db.execute<{ action: string; correlation_id: string | null; version_id: string | null }>(
      TENANT_A,
      `SELECT action, correlation_id, version_id FROM "DocumentAccessEvent" WHERE envelope_id = $1`,
      [envelopeId]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('DOWNLOAD');
    expect(rows[0].correlation_id).toBeNull();
    expect(rows[0].version_id).toBeNull();
  });

  test('never throws even if the insert itself would fail', async () => {
    // An invalid action value would violate the CHECK constraint —
    // recordDocumentAccessEvent must swallow that, not propagate it.
    await expect(
      recordDocumentAccessEvent({
        tenantId: TENANT_A,
        userId: USER_ID,
        envelopeId: crypto.randomUUID(),
        action: 'DELETE' as never,
      })
    ).resolves.toBeUndefined();
  });

  test('is tenant-isolated — a cross-tenant read never sees another tenant\'s access events', async () => {
    const envelopeId = crypto.randomUUID();
    await recordDocumentAccessEvent({
      tenantId: TENANT_A,
      userId: USER_ID,
      envelopeId,
      action: 'PREVIEW',
    });

    const rowsFromOtherTenant = await db.execute(
      TENANT_B,
      `SELECT id FROM "DocumentAccessEvent" WHERE envelope_id = $1`,
      [envelopeId]
    );
    expect(rowsFromOtherTenant).toHaveLength(0);
  });
});

describe('extractCorrelationId', () => {
  function fakeRequest(headers: Record<string, string>): { headers: { get(name: string): string | null } } {
    return { headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } };
  }

  test('prefers x-request-id when present', () => {
    expect(extractCorrelationId(fakeRequest({ 'x-request-id': 'abc', 'x-vercel-id': 'def' }))).toBe('abc');
  });

  test('falls back to x-vercel-id when x-request-id is absent', () => {
    expect(extractCorrelationId(fakeRequest({ 'x-vercel-id': 'def' }))).toBe('def');
  });

  test('returns null when neither header is present — never fabricated', () => {
    expect(extractCorrelationId(fakeRequest({}))).toBeNull();
  });
});
