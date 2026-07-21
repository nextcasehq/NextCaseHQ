import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { putObject, getObject } from '@/lib/storage/object-storage';

const TENANT_A = '00000000-0000-4000-8000-0000000000e3';
const TENANT_B = '00000000-0000-4000-8000-0000000000e4';
const USER_ID = '00000000-0000-4000-8000-00000000009e';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'document-detail-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(method: string, headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/documents/placeholder'), {
    method,
    headers: { origin: 'http://localhost:3000', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET/PATCH/DELETE /api/documents/[id]', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Document Detail Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Document Detail Test Tenant B',
    ]);
  });

  beforeEach(async () => {
    // DocumentVersion.envelope_id is RESTRICT, not CASCADE (Sprint 3, PR
    // 3A) — must be cleared before the envelopes it references, or this
    // cleanup itself would fail with a foreign key violation for any test
    // that created version rows.
    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
  });

  afterAll(async () => {
    await db.execute(TENANT_A, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentVersion" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await db.execute(TENANT_A, `DELETE FROM "LegalCase" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_A, `DELETE FROM "Matter" WHERE tenant_id = $1`, [TENANT_A]);
    await closePool();
  });

  async function createDocument(tenantId: string, title: string): Promise<string> {
    const rows = await db.execute<{ id: string }>(
      tenantId,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [tenantId, title]
    );
    return rows[0].id;
  }

  test('GET rejects an invalid (non-UUID) id with 400', async () => {
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams('not-a-uuid'));
    expect(res.status).toBe(400);
  });

  test('GET rejects with no session (401)', async () => {
    const id = await createDocument(TENANT_A, 'Needs Auth');
    const res = await GET(buildRequest('GET', {}), routeParams(id));
    expect(res.status).toBe(401);
  });

  test('GET returns the document for the owning tenant', async () => {
    const id = await createDocument(TENANT_A, 'Owned Document');
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.document.title).toBe('Owned Document');
  });

  test('GET includes document_type, version_count, and updated_at (Milestone 4, Prepare Document)', async () => {
    const rows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (tenant_id, title, document_type) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Typed Document', 'BAIL_APPLICATION']
    );
    const id = rows[0].id;
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentVersion" (tenant_id, envelope_id, version_number, title, storage_structure) VALUES ($1, $2, 1, $3, '{}')`,
      [TENANT_A, id, 'Typed Document']
    );

    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.document.document_type).toBe('BAIL_APPLICATION');
    expect(body.document.version_count).toBe(1);
    expect(body.document.updated_at).toBeTruthy();
  });

  test('GET returns 404 for a real document belonging to a different tenant (RLS-backed, not a permission leak)', async () => {
    const id = await createDocument(TENANT_A, 'Belongs To A');
    const res = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_B) }), routeParams(id));
    expect(res.status).toBe(404);
  });

  test('GET returns 404 for a well-formed but non-existent id', async () => {
    const res = await GET(
      buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }),
      routeParams(NON_EXISTENT_ID)
    );
    expect(res.status).toBe(404);
  });

  test('PATCH rejects an untrusted origin', async () => {
    const id = await createDocument(TENANT_A, 'CSRF Target');
    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' }, { matter_id: null }),
      routeParams(id)
    );
    expect(res.status).toBe(403);
  });

  test('PATCH rejects an empty update payload (400)', async () => {
    const id = await createDocument(TENANT_A, 'Untouched');
    const res = await PATCH(buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, {}), routeParams(id));
    expect(res.status).toBe(400);
  });

  test('PATCH returns 404 for a document belonging to another tenant', async () => {
    const id = await createDocument(TENANT_B, 'Tenant B Document');
    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { matter_id: null }),
      routeParams(id)
    );
    expect(res.status).toBe(404);
  });

  test('PATCH links a document directly to a Matter', async () => {
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'PATCH Linkage Test Matter']
    );
    const matterId = matterRows[0].id;
    const id = await createDocument(TENANT_A, 'Relink Target');

    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { matter_id: matterId }),
      routeParams(id)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.document.matter_id).toBe(matterId);
  });

  test('PATCH rejects a matter_id belonging to a different tenant (400)', async () => {
    const matterRows = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, 'Tenant B Matter']
    );
    const matterId = matterRows[0].id;
    const id = await createDocument(TENANT_A, 'Cross Tenant Relink');

    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { matter_id: matterId }),
      routeParams(id)
    );
    expect(res.status).toBe(400);
  });

  test('PATCH rejects a matter_id that disagrees with the document\'s own case_id parent Matter (400 PROCEEDING_MATTER_MISMATCH)', async () => {
    const realMatterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Real Parent Matter For PATCH']
    );
    const realMatterId = realMatterRows[0].id;
    const otherMatterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Unrelated Matter For PATCH']
    );
    const otherMatterId = otherMatterRows[0].id;
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, matter_id) VALUES ($1, $2, $3, $4) RETURNING id`,
      [TENANT_A, 'PATCH Mismatch Proceeding', 'IN', realMatterId]
    );
    const caseId = caseRows[0].id;
    const id = await createDocument(TENANT_A, 'Mismatch Target');
    await db.execute(TENANT_A, `UPDATE "DocumentEnvelope" SET case_id = $1 WHERE id = $2`, [caseId, id]);

    const res = await PATCH(
      buildRequest('PATCH', { cookie: await sessionCookieHeader(TENANT_A) }, { matter_id: otherMatterId }),
      routeParams(id)
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('PROCEEDING_MATTER_MISMATCH');
  });

  test('DELETE rejects an untrusted origin', async () => {
    const id = await createDocument(TENANT_A, 'To Delete');
    const res = await DELETE(
      buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_A), origin: 'https://attacker.example' }),
      routeParams(id)
    );
    expect(res.status).toBe(403);
  });

  test('DELETE removes the document for the owning tenant', async () => {
    const id = await createDocument(TENANT_A, 'To Delete');
    const res = await DELETE(buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(res.status).toBe(200);

    const verify = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(verify.status).toBe(404);
  });

  test('DELETE cannot remove a document belonging to a different tenant', async () => {
    const id = await createDocument(TENANT_A, 'Protected');
    const res = await DELETE(buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_B) }), routeParams(id));
    expect(res.status).toBe(404);

    const verify = await GET(buildRequest('GET', { cookie: await sessionCookieHeader(TENANT_A) }), routeParams(id));
    expect(verify.status).toBe(200);
  });

  test('DELETE also removes the real underlying object from storage, not just the metadata row', async () => {
    if (!process.env.S3_ENDPOINT) return; // requires `pnpm test:start-s3rver` running

    const documentId = crypto.randomUUID();
    const objectKey = `${TENANT_A}/${documentId}/delete-test.txt`;
    await putObject(objectKey, Buffer.from('to be deleted'), 'text/plain');

    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, TENANT_A, 'delete-test.txt', { object_key: objectKey }]
    );

    const res = await DELETE(
      buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_A) }),
      routeParams(documentId)
    );
    expect(res.status).toBe(200);

    await expect(getObject(objectKey)).rejects.toThrow();
  });

  test('DELETE tears down every DocumentVersion and its own storage object, not just the envelope\'s', async () => {
    if (!process.env.S3_ENDPOINT) return; // requires `pnpm test:start-s3rver` running

    const documentId = crypto.randomUUID();
    const v1Key = `${TENANT_A}/${documentId}/versions/v1.txt`;
    const v2Key = `${TENANT_A}/${documentId}/versions/v2.txt`;
    await putObject(v1Key, Buffer.from('version one'), 'text/plain');
    await putObject(v2Key, Buffer.from('version two'), 'text/plain');

    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, TENANT_A, 'multi-version.txt', { object_key: v2Key }]
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentVersion" (tenant_id, envelope_id, version_number, title, storage_structure) VALUES ($1, $2, 1, $3, $4)`,
      [TENANT_A, documentId, 'multi-version.txt', { object_key: v1Key }]
    );
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentVersion" (tenant_id, envelope_id, version_number, title, storage_structure) VALUES ($1, $2, 2, $3, $4)`,
      [TENANT_A, documentId, 'multi-version.txt', { object_key: v2Key }]
    );

    const res = await DELETE(
      buildRequest('DELETE', { cookie: await sessionCookieHeader(TENANT_A) }),
      routeParams(documentId)
    );
    expect(res.status).toBe(200);

    await expect(getObject(v1Key)).rejects.toThrow();
    await expect(getObject(v2Key)).rejects.toThrow();

    const remainingVersions = await db.execute<{ id: string }>(
      TENANT_A,
      `SELECT id FROM "DocumentVersion" WHERE envelope_id = $1`,
      [documentId]
    );
    expect(remainingVersions).toHaveLength(0);
  });

  test('DELETE returns a deterministic 409 (never a 500) when a linked record blocks it, and leaves versions intact', async () => {
    // AiUsageEvent is an append-only ledger — UPDATE/DELETE are revoked at
    // the database grant level (see db/schema.sql) — so once a real
    // AiUsageEvent.document_id points at this envelope, the envelope can
    // never be deleted again, by design. A dedicated, disposable tenant
    // (never touched by this file's shared beforeEach/afterAll cleanup)
    // keeps that permanently-undeletable row from breaking every other
    // test's blanket "DELETE FROM DocumentEnvelope WHERE tenant_id = ..."
    // cleanup.
    const isolatedTenant = crypto.randomUUID();
    await db.execute(isolatedTenant, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2)`, [
      isolatedTenant,
      'Document Delete Conflict Test Tenant',
    ]);
    const isolatedSession = await sessionCookieHeader(isolatedTenant);

    const documentId = crypto.randomUUID();
    await db.execute(
      isolatedTenant,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title) VALUES ($1, $2, $3)`,
      [documentId, isolatedTenant, 'Blocked Delete']
    );
    await db.execute(
      isolatedTenant,
      `INSERT INTO "DocumentVersion" (tenant_id, envelope_id, version_number, title) VALUES ($1, $2, 1, $3)`,
      [isolatedTenant, documentId, 'Blocked Delete']
    );
    const usageRows = await db.execute<{ id: string }>(
      isolatedTenant,
      `INSERT INTO "AiUsageEvent" (tenant_id, document_id, operation_type, status) VALUES ($1, $2, $3, $4) RETURNING id`,
      [isolatedTenant, documentId, 'DOCUMENT_SUMMARIZE', 'SUCCESS']
    );
    expect(usageRows).toHaveLength(1);

    const res = await DELETE(buildRequest('DELETE', { cookie: isolatedSession }), routeParams(documentId));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('DOCUMENT_HAS_LINKED_RECORDS');

    // Neither the envelope nor its version was actually deleted — the
    // atomic multi-CTE delete must not have partially applied.
    const stillThereEnvelope = await db.execute<{ id: string }>(isolatedTenant, `SELECT id FROM "DocumentEnvelope" WHERE id = $1`, [documentId]);
    expect(stillThereEnvelope).toHaveLength(1);
    const stillThereVersion = await db.execute<{ id: string }>(isolatedTenant, `SELECT id FROM "DocumentVersion" WHERE envelope_id = $1`, [documentId]);
    expect(stillThereVersion).toHaveLength(1);
  });
});
