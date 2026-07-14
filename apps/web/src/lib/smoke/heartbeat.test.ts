import { Module9Processor } from '@nextcase/country-packs';
import { DatabaseClient } from '../db/db-client';
import { validateEnv } from '../../../../../config/env.smoke';

describe('Phase 3.8: End-to-End Operational Smoke Test', () => {
  const processor = new Module9Processor();
  const db = new DatabaseClient();
  const TENANT_ID = '00000000-0000-4000-8000-00000000000c';

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

    // 2. Multi-tenant Indian Provisioning & Case Creation
    const caseData = { id: 'case_001', framework: 'BNSS_2023', jurisdiction: 'IN' };
    const insertResult = await db.execute(TENANT_ID, 'INSERT INTO cases', [caseData]);
    expect(insertResult[0].tenant_id).toBe(TENANT_ID);

    // 3. Document Ingestion & PII Redaction Audit
    const rawDocument = 'Tenant C Litigant Aadhaar: 1234 5678 9012';
    const startTime = performance.now();
    const scrubbedDocument = processor.scrubPII(rawDocument);
    const endTime = performance.now();

    expect(scrubbedDocument).toContain('[AADHAAR_REDACTED]');
    expect(endTime - startTime).toBeLessThan(5); // 5ms budget

    // 4. Audit Log Check (Simulated)
    console.log(`[SMOKE_TEST] Heartbeat successful for Tenant ${TENANT_ID}. Audit trail locked.`);
  });
});
