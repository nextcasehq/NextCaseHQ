import { NextRequest } from 'next/server';
import { POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { deleteObject, __resetObjectStorageConfigForTests } from '@/lib/storage/object-storage';

const TENANT_A = '00000000-0000-4000-8000-0000000000a1';
const TENANT_B = '00000000-0000-4000-8000-0000000000b1';
const USER_ID = '00000000-0000-4000-8000-00000000009a';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({
    sub: USER_ID,
    tenantId,
    email: 'upload-test@nextcase.local',
  });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>, body: string = 'file-bytes'): NextRequest {
  return new NextRequest(new URL('http://localhost/api/documents/upload'), {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', ...headers },
    body,
  });
}

const hasS3 = () => Boolean(process.env.S3_ENDPOINT);

describe('POST /api/documents/upload — real persistence + object storage', () => {
  const db = new DatabaseClient();
  const uploadedObjectKeys: string[] = [];

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Upload Route Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Upload Route Test Tenant B',
    ]);
    // DocumentVersion.created_by references "User"(id) — the session's
    // `sub` claim must resolve to a real row for the version-1 insert
    // that now happens atomically with every upload.
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'upload-test@nextcase.local']
    );
  });

  afterAll(async () => {
    await Promise.all(uploadedObjectKeys.map((key) => deleteObject(key).catch(() => {})));
    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "User" WHERE id = $1`, [USER_ID]);
    await closePool();
  });

  test('returns 503 when object storage is not configured, rather than silently accepting', async () => {
    const original = process.env.S3_ENDPOINT;
    delete process.env.S3_ENDPOINT;
    __resetObjectStorageConfigForTests();

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
    });
    const res = await POST(req);
    expect(res.status).toBe(503);

    if (original !== undefined) process.env.S3_ENDPOINT = original;
    __resetObjectStorageConfigForTests();
  });

  test('rejects a request from an untrusted origin (CSRF defense) even with a valid session', async () => {
    if (!hasS3()) return;
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      origin: 'https://attacker.example',
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('INVALID_ORIGIN');
  });

  test('rejects requests with no session cookie (401)', async () => {
    if (!hasS3()) return;
    const req = buildRequest({ 'x-tenant-key-version': 'v1', 'x-file-name': 'contract.pdf' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('rejects requests with an invalid/garbage session cookie (401)', async () => {
    if (!hasS3()) return;
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      'x-file-name': 'contract.pdf',
      cookie: `${SESSION_COOKIE_NAME}=not-a-real-jwt`,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test('still requires x-tenant-key-version (400) even when authenticated', async () => {
    if (!hasS3()) return;
    const req = buildRequest({ cookie: await sessionCookieHeader(TENANT_A), 'x-file-name': 'contract.pdf' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('requires x-file-name (400)', async () => {
    if (!hasS3()) return;
    const req = buildRequest({ 'x-tenant-key-version': 'v1', cookie: await sessionCookieHeader(TENANT_A) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('rejects a disallowed file type (400)', async () => {
    if (!hasS3()) return;
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'installer.exe',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('processes the upload under the session tenant, ignoring a spoofed x-nextcase-tenant-id header', async () => {
    if (!hasS3()) return;
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-nextcase-tenant-id': TENANT_B,
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.tenant_id).toBe(TENANT_A);
    expect(body.tenant_id).not.toBe(TENANT_B);
  });

  test('persists a real DocumentEnvelope row AND real object storage bytes, not a mock', async () => {
    if (!hasS3()) return;
    const req = buildRequest(
      {
        'x-tenant-key-version': 'v1',
        cookie: await sessionCookieHeader(TENANT_A),
        'x-file-name': 'petition-draft.pdf',
      },
      'the actual document bytes'
    );
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();

    const rows = await db.execute<{ id: string; title: string; storage_structure: { object_key: string; bytes_stored: number } }>(
      TENANT_A,
      `SELECT id, title, storage_structure FROM "DocumentEnvelope" WHERE id = $1`,
      [body.id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('petition-draft.pdf');
    expect(rows[0].storage_structure.bytes_stored).toBe('the actual document bytes'.length);
    uploadedObjectKeys.push(rows[0].storage_structure.object_key);
  });

  test('rejects a malformed x-case-id (400)', async () => {
    if (!hasS3()) return;
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-case-id': 'not-a-uuid',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('rejects a well-formed x-case-id that does not resolve to an accessible case (400, not 500)', async () => {
    if (!hasS3()) return;
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-case-id': '00000000-0000-4000-8000-000000000000',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('links the document to a real case when x-case-id references one in the same tenant', async () => {
    if (!hasS3()) return;
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Upload Linkage Test Case', 'IN']
    );
    const caseId = caseRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-case-id': caseId,
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.case_id).toBe(caseId);

    const rows = await db.execute<{ storage_structure: { object_key: string } }>(
      TENANT_A,
      `SELECT storage_structure FROM "DocumentEnvelope" WHERE id = $1`,
      [body.id]
    );
    uploadedObjectKeys.push(rows[0].storage_structure.object_key);

    // DocumentEnvelope.case_id is now RESTRICT, not CASCADE (Sprint 3, PR
    // 3A) — the linked document (and its version history) must be torn
    // down explicitly before the case it references can be deleted.
    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE envelope_id = $1`, [body.id]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE id = $1`, [body.id]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE id = $1`, [caseId]);
  });

  test('rejects a case_id belonging to a different tenant (400) — real fix for a real FK-bypasses-RLS bug found in testing', async () => {
    if (!hasS3()) return;
    const caseRows = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_B, 'Tenant B Case', 'US']
    );
    const tenantBCaseId = caseRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-case-id': tenantBCaseId,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    await db.execute(TENANT_B, `DELETE FROM "LegalCase" WHERE id = $1`, [tenantBCaseId]);
  });

  test('rejects a malformed x-matter-id (400)', async () => {
    if (!hasS3()) return;
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-matter-id': 'not-a-uuid',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('rejects a well-formed x-matter-id that does not resolve to an accessible matter (400, not 500)', async () => {
    if (!hasS3()) return;
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-matter-id': '00000000-0000-4000-8000-000000000000',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('rejects a matter_id belonging to a different tenant (400)', async () => {
    if (!hasS3()) return;
    const matterRows = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, 'Tenant B Matter']
    );
    const tenantBMatterId = matterRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-matter-id': tenantBMatterId,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE id = $1`, [tenantBMatterId]);
  });

  test('links the document directly to a Matter via x-matter-id, with no Proceeding', async () => {
    if (!hasS3()) return;
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Direct Matter Link Test']
    );
    const matterId = matterRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-matter-id': matterId,
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.matter_id).toBe(matterId);
    expect(body.case_id).toBeNull();

    const rows = await db.execute<{ storage_structure: { object_key: string } }>(
      TENANT_A,
      `SELECT storage_structure FROM "DocumentEnvelope" WHERE id = $1`,
      [body.id]
    );
    uploadedObjectKeys.push(rows[0].storage_structure.object_key);

    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE envelope_id = $1`, [body.id]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE id = $1`, [body.id]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [matterId]);
  });

  test('auto-derives matter_id from the Proceeding parent Matter when x-matter-id is omitted', async () => {
    if (!hasS3()) return;
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Auto-derive Parent Matter']
    );
    const matterId = matterRows[0].id;
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_A, 'Auto-derive Test Proceeding', 'IN', matterId]
    );
    const caseId = caseRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-case-id': caseId,
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.case_id).toBe(caseId);
    expect(body.matter_id).toBe(matterId);

    const rows = await db.execute<{ storage_structure: { object_key: string } }>(
      TENANT_A,
      `SELECT storage_structure FROM "DocumentEnvelope" WHERE id = $1`,
      [body.id]
    );
    uploadedObjectKeys.push(rows[0].storage_structure.object_key);

    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE envelope_id = $1`, [body.id]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE id = $1`, [body.id]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE id = $1`, [caseId]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [matterId]);
  });

  test('rejects x-matter-id that disagrees with x-case-id\'s own parent Matter (400 PROCEEDING_MATTER_MISMATCH)', async () => {
    if (!hasS3()) return;
    const realMatterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Real Parent Matter']
    );
    const realMatterId = realMatterRows[0].id;
    const otherMatterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Unrelated Matter']
    );
    const otherMatterId = otherMatterRows[0].id;
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_A, 'Mismatch Test Proceeding', 'IN', realMatterId]
    );
    const caseId = caseRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-case-id': caseId,
      'x-matter-id': otherMatterId,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('PROCEEDING_MATTER_MISMATCH');

    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE id = $1`, [caseId]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [realMatterId]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [otherMatterId]);
  });

  test('creates a version-1 DocumentVersion row atomically with the DocumentEnvelope', async () => {
    if (!hasS3()) return;
    const req = buildRequest(
      {
        'x-tenant-key-version': 'v1',
        cookie: await sessionCookieHeader(TENANT_A),
        'x-file-name': 'versioned.pdf',
      },
      'versioned document bytes'
    );
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();

    const versions = await db.execute<{
      version_number: number;
      title: string;
      storage_structure: { object_key: string; bytes_stored: number };
      created_by: string;
    }>(
      TENANT_A,
      `SELECT version_number, title, storage_structure, created_by FROM "DocumentVersion" WHERE envelope_id = $1`,
      [body.id]
    );
    expect(versions).toHaveLength(1);
    expect(versions[0].version_number).toBe(1);
    expect(versions[0].title).toBe('versioned.pdf');
    expect(versions[0].storage_structure.bytes_stored).toBe('versioned document bytes'.length);
    expect(versions[0].created_by).toBe(USER_ID);

    uploadedObjectKeys.push(versions[0].storage_structure.object_key);
  });
});
