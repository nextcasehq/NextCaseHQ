import { NextRequest } from 'next/server';
import { POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { deleteObject, __resetObjectStorageConfigForTests } from '@/lib/storage/object-storage';

const TENANT_A = '00000000-0000-4000-8000-0000000000a1';
const TENANT_B = '00000000-0000-4000-8000-0000000000b1';
const USER_ID_A = '00000000-0000-4000-8000-00000000009a';
const USER_ID_B = '00000000-0000-4000-8000-00000000009b';
const USER_ID_BY_TENANT: Record<string, string> = { [TENANT_A]: USER_ID_A, [TENANT_B]: USER_ID_B };

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({
    sub: USER_ID_BY_TENANT[tenantId],
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
    // Sprint 3, PR 3A: DocumentVersion.uploaded_by is a real FK to User, so
    // the session's user id must correspond to a real row for the atomic
    // envelope+version insert to succeed.
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email, name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [USER_ID_A, TENANT_A, 'upload-test-a@nextcase.local', 'Upload Test User A']
    );
    await db.execute(
      TENANT_B,
      `INSERT INTO "User" (id, tenant_id, email, name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [USER_ID_B, TENANT_B, 'upload-test-b@nextcase.local', 'Upload Test User B']
    );
  });

  afterAll(async () => {
    await Promise.all(uploadedObjectKeys.map((key) => deleteObject(key).catch(() => {})));
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
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

    // The case_id -> LegalCase foreign key is no longer ON DELETE CASCADE
    // (Sprint 3, PR 3A — deleting a Proceeding must never silently remove
    // linked Documents), so the Document must be removed before the case
    // it references, or this delete would now correctly fail.
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
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'contract.pdf',
      'x-matter-id': matterRows[0].id,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    await db.execute(TENANT_B, `DELETE FROM "Matter" WHERE id = $1`, [matterRows[0].id]);
  });

  test('links a document directly to an advisory Matter with no Proceeding at all', async () => {
    if (!hasS3()) return;
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title, engagement_type) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Advisory Matter, No Proceeding', 'ADVISORY']
    );
    const matterId = matterRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'advisory-memo.pdf',
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

    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE id = $1`, [body.id]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [matterId]);
  });

  test('auto-populates matter_id from case_id when the Proceeding already belongs to a Matter', async () => {
    if (!hasS3()) return;
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Matter With A Filed Case']
    );
    const matterId = matterRows[0].id;
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_A, 'Filed Case Under Matter', 'US', matterId]
    );
    const caseId = caseRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'filing.pdf',
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

    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE id = $1`, [body.id]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE id = $1`, [caseId]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [matterId]);
  });

  test('accepts matter_id and case_id together when they agree', async () => {
    if (!hasS3()) return;
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Agreeing Matter']
    );
    const matterId = matterRows[0].id;
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_A, 'Agreeing Case', 'US', matterId]
    );
    const caseId = caseRows[0].id;

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'agreeing.pdf',
      'x-case-id': caseId,
      'x-matter-id': matterId,
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.matter_id).toBe(matterId);

    const rows = await db.execute<{ storage_structure: { object_key: string } }>(
      TENANT_A,
      `SELECT storage_structure FROM "DocumentEnvelope" WHERE id = $1`,
      [body.id]
    );
    uploadedObjectKeys.push(rows[0].storage_structure.object_key);

    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE id = $1`, [body.id]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE id = $1`, [caseId]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [matterId]);
  });

  test('rejects an explicit matter_id that conflicts with the Proceedings own Matter (400 MATTER_CASE_MISMATCH)', async () => {
    if (!hasS3()) return;
    const realMatterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'The Case Real Matter']
    );
    const wrongMatterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'A Different, Wrong Matter']
    );
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_A, 'Mismatch Test Case', 'US', realMatterRows[0].id]
    );

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'mismatch.pdf',
      'x-case-id': caseRows[0].id,
      'x-matter-id': wrongMatterRows[0].id,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MATTER_CASE_MISMATCH');

    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE id = $1`, [caseRows[0].id]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [realMatterRows[0].id]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [wrongMatterRows[0].id]);
  });

  test('rejects an explicit matter_id when the case has no Matter of its own (also a mismatch, not silently accepted)', async () => {
    if (!hasS3()) return;
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Unrelated Matter']
    );
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Case With No Matter', 'US']
    );

    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'no-matter-case.pdf',
      'x-case-id': caseRows[0].id,
      'x-matter-id': matterRows[0].id,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('MATTER_CASE_MISMATCH');

    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE id = $1`, [caseRows[0].id]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE id = $1`, [matterRows[0].id]);
  });

  test('the first DocumentVersion row is created atomically with the upload, version 1', async () => {
    if (!hasS3()) return;
    const req = buildRequest({
      'x-tenant-key-version': 'v1',
      cookie: await sessionCookieHeader(TENANT_A),
      'x-file-name': 'versioned-upload.pdf',
    });
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();

    const versions = await db.execute<{ version_number: number; object_key: string; content_type: string; size_bytes: number }>(
      TENANT_A,
      `SELECT version_number, object_key, content_type, size_bytes FROM "DocumentVersion" WHERE document_id = $1`,
      [body.id]
    );
    expect(versions).toHaveLength(1);
    expect(versions[0].version_number).toBe(1);
    expect(versions[0].content_type).toBe('application/pdf');
    uploadedObjectKeys.push(versions[0].object_key);

    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE id = $1`, [body.id]);
  });
});
