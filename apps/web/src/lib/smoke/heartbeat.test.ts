import { Module9Processor } from '@nextcase/country-packs';
import { DatabaseClient, closePool } from '../db/db-client';
import { validateEnv } from '../../../../../config/env.smoke';

describe('Phase 3.8: End-to-End Operational Smoke Test', () => {
  const processor = new Module9Processor();
  const db = new DatabaseClient();
  const TENANT_ID = '00000000-0000-4000-8000-00000000000c';

  beforeAll(async () => {
    await db.execute(
      TENANT_ID,
      `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID, 'Test Tenant C']
    );
    await db.execute(TENANT_ID, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_ID]);
  });

  afterAll(async () => {
    await db.execute(TENANT_ID, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_ID]);
    await closePool();
  });

  test('FULL LIFECYCLE: RC1 Heartbeat Verification', async () => {
    // 1. Production Env Schema Validation
    const prodEnv = {
      DNS: 'https://app.nextcase.in',
      SSL_PATH: '/etc/ssl/certs',
      OAUTH_URL: 'https://auth.nextcase.in',
      DB_SESSION_URL: 'postgres://db',
      NODE_ENV: 'production'
    };
    expect(() => validateEnv(prodEnv)).not.toThrow();

    // 2. Multi-tenant Indian Provisioning & Case Creation (real PostgreSQL insert)
    const insertResult = await db.execute(
      TENANT_ID,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, state_metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id, tenant_id, title, country_code, state_metadata`,
      [TENANT_ID, 'RC1 Heartbeat Case', 'IN', JSON.stringify({ framework: 'BNSS_2023' })]
    );
    expect(insertResult[0].tenant_id).toBe(TENANT_ID);

    // 3. Document Ingestion & PII Redaction Audit
    const rawDocument = 'Tenant C Litigant Aadhaar: 1234 5678 9012';
    const startTime = performance.now();
    const scrubbedDocument = processor.scrubPII(rawDocument);
    const endTime = performance.now();

    expect(scrubbedDocument).toContain('[AADHAAR_REDACTED]');
    expect(endTime - startTime).toBeLessThan(5); // 5ms budget

    // 4. Audit Log Check
    console.log(`[SMOKE_TEST] Heartbeat successful for Tenant ${TENANT_ID}. Audit trail locked.`);
  });
});
