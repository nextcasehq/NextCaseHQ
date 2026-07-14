import { DatabaseClient } from '../db-client';

describe('High-Priority Verification: Cross-Tenant RLS Isolation', () => {
  let db: DatabaseClient;
  const TENANT_A = '00000000-0000-4000-8000-00000000000a';
  const TENANT_B = '00000000-0000-4000-8000-00000000000b';

  beforeEach(() => {
    db = new DatabaseClient();
  });

  test('Absolute RLS Isolation between Tenant_A and Tenant_B', async () => {
    // 1. DATA INJECTION: Inject documents for both tenants
    await db.execute(TENANT_A, 'INSERT INTO documents', [{ id: 'doc_a', title: 'Private A' }]);
    await db.execute(TENANT_B, 'INSERT INTO documents', [{ id: 'doc_b', title: 'Private B' }]);

    // 2. ISOLATION AUDIT: Tenant_A attempts to read
    const tenantAResults = await db.execute(TENANT_A, 'SELECT * FROM documents', []);
    expect(tenantAResults).toHaveLength(1);
    expect(tenantAResults[0].id).toBe('doc_a');
    expect(tenantAResults.some(r => r.id === 'doc_b')).toBe(false);

    // 3. ISOLATION AUDIT: Tenant_B attempts to read
    const tenantBResults = await db.execute(TENANT_B, 'SELECT * FROM documents', []);
    expect(tenantBResults).toHaveLength(1);
    expect(tenantBResults[0].id).toBe('doc_b');
    expect(tenantBResults.some(r => r.id === 'doc_a')).toBe(false);

    console.log('[AUDIT] RLS Isolation Verified: 100% data separation.');
  });
});
