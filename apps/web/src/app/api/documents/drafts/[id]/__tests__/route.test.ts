import { NextRequest } from 'next/server';
import { GET as GET_DRAFT, PATCH as AUTOSAVE_DRAFT } from '../route';
import { POST as CREATE_DRAFT } from '../../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000c1';
const USER_A = '00000000-0000-4000-8000-0000000000c2';
const USER_A2 = '00000000-0000-4000-8000-0000000000c4';
const TENANT_B = '00000000-0000-4000-8000-0000000000c3';
const USER_B = '00000000-0000-4000-8000-0000000000c5';
const NON_EXISTENT_ID = '00000000-0000-4000-8000-000000000000';

async function cookieFor(tenantId: string, userId: string, email: string): Promise<string> {
  const token = await signSessionToken({ sub: userId, tenantId, email });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function req(path: string, method: string, body?: unknown, cookie?: string): NextRequest {
  const headers: Record<string, string> = { origin: 'http://localhost:3000' };
  if (cookie) headers.cookie = cookie;
  return new NextRequest(new URL(`http://localhost${path}`), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET/PATCH /api/documents/drafts/[id] — durable draft recovery and autosave', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Draft Recovery Test Tenant A',
    ]);
    await db.execute(TENANT_A, `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [
      USER_A,
      TENANT_A,
      'draft-recovery-advocate-a@nextcase.local',
    ]);
    await db.execute(TENANT_A, `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [
      USER_A2,
      TENANT_A,
      'draft-recovery-advocate-a2@nextcase.local',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Draft Recovery Test Tenant B',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [
      USER_B,
      TENANT_B,
      'draft-recovery-advocate-b@nextcase.local',
    ]);
  });

  afterAll(async () => {
    await closePool();
  });

  async function createDraft(cookie: string, content = 'Initial content.') {
    const response = await CREATE_DRAFT(req('/api/documents/drafts', 'POST', { content }, cookie));
    const body = await response.json();
    return body.draft as { id: string; revision: number; content: string };
  }

  test('GET rejects an unauthenticated request (401)', async () => {
    const response = await GET_DRAFT(req(`/api/documents/drafts/${NON_EXISTENT_ID}`, 'GET'), routeParams(NON_EXISTENT_ID));
    expect(response.status).toBe(401);
  });

  test('GET returns 404 for a well-formed but non-existent draft id', async () => {
    const cookie = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    const response = await GET_DRAFT(req(`/api/documents/drafts/${NON_EXISTENT_ID}`, 'GET', undefined, cookie), routeParams(NON_EXISTENT_ID));
    expect(response.status).toBe(404);
  });

  test('GET recovers a previously-created draft (server-side / Tier 2 recovery after refresh)', async () => {
    const cookie = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    const draft = await createDraft(cookie, 'Recoverable content.');
    const response = await GET_DRAFT(req(`/api/documents/drafts/${draft.id}`, 'GET', undefined, cookie), routeParams(draft.id));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.draft.content).toBe('Recoverable content.');
  });

  test('a different user in the SAME tenant cannot read another advocate\'s private working draft (404, no existence leak)', async () => {
    const cookieA = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    const cookieA2 = await cookieFor(TENANT_A, USER_A2, 'draft-recovery-advocate-a2@nextcase.local');
    const draft = await createDraft(cookieA);
    const response = await GET_DRAFT(req(`/api/documents/drafts/${draft.id}`, 'GET', undefined, cookieA2), routeParams(draft.id));
    expect(response.status).toBe(404);
  });

  test('a user in a DIFFERENT tenant cannot read a draft — cross-tenant rejection (404)', async () => {
    const cookieA = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    const cookieB = await cookieFor(TENANT_B, USER_B, 'draft-recovery-advocate-b@nextcase.local');
    const draft = await createDraft(cookieA);
    const response = await GET_DRAFT(req(`/api/documents/drafts/${draft.id}`, 'GET', undefined, cookieB), routeParams(draft.id));
    expect(response.status).toBe(404);
  });

  test('PATCH rejects an unauthenticated autosave (401)', async () => {
    const response = await AUTOSAVE_DRAFT(
      req(`/api/documents/drafts/${NON_EXISTENT_ID}`, 'PATCH', { content: 'x', expected_revision: 1 }),
      routeParams(NON_EXISTENT_ID)
    );
    expect(response.status).toBe(401);
  });

  test('PATCH autosaves new content and advances the revision', async () => {
    const cookie = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    const draft = await createDraft(cookie, 'v1');
    const response = await AUTOSAVE_DRAFT(
      req(`/api/documents/drafts/${draft.id}`, 'PATCH', { content: 'v2', expected_revision: draft.revision }, cookie),
      routeParams(draft.id)
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.draft.content).toBe('v2');
    expect(body.draft.revision).toBe(draft.revision + 1);
  });

  test('repeated autosave (debounce firing multiple times) keeps advancing the revision without error', async () => {
    const cookie = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    let draft = await createDraft(cookie, 'r0');
    for (let i = 1; i <= 5; i++) {
      const response = await AUTOSAVE_DRAFT(
        req(`/api/documents/drafts/${draft.id}`, 'PATCH', { content: `r${i}`, expected_revision: draft.revision }, cookie),
        routeParams(draft.id)
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      draft = body.draft;
    }
    expect(draft.content).toBe('r5');
    expect(draft.revision).toBe(6);
  });

  test('a stale expected_revision is rejected as a conflict (409), carrying the current server state', async () => {
    const cookie = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    const draft = await createDraft(cookie, 'base');
    // First write succeeds and moves the server ahead of what the client
    // (still holding the original revision) knows about.
    await AUTOSAVE_DRAFT(
      req(`/api/documents/drafts/${draft.id}`, 'PATCH', { content: 'someone-elses-edit', expected_revision: draft.revision }, cookie),
      routeParams(draft.id)
    );
    // A second write using the now-stale original revision must conflict,
    // not silently overwrite the intervening edit.
    const response = await AUTOSAVE_DRAFT(
      req(`/api/documents/drafts/${draft.id}`, 'PATCH', { content: 'my-stale-edit', expected_revision: draft.revision }, cookie),
      routeParams(draft.id)
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('REVISION_CONFLICT');
    expect(body.current.content).toBe('someone-elses-edit');
    expect(body.current.revision).toBe(draft.revision + 1);
  });

  test('a different tenant cannot autosave into another tenant\'s draft (404)', async () => {
    const cookieA = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    const cookieB = await cookieFor(TENANT_B, USER_B, 'draft-recovery-advocate-b@nextcase.local');
    const draft = await createDraft(cookieA);
    const response = await AUTOSAVE_DRAFT(
      req(`/api/documents/drafts/${draft.id}`, 'PATCH', { content: 'hijack attempt', expected_revision: draft.revision }, cookieB),
      routeParams(draft.id)
    );
    expect(response.status).toBe(404);
  });

  test('autosaving never creates a DocumentVersion row — no permanent version for every keystroke', async () => {
    const cookie = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    const draft = await createDraft(cookie, 'v0');
    for (let i = 1; i <= 3; i++) {
      const current = await GET_DRAFT(req(`/api/documents/drafts/${draft.id}`, 'GET', undefined, cookie), routeParams(draft.id));
      const currentBody = await current.json();
      await AUTOSAVE_DRAFT(
        req(`/api/documents/drafts/${draft.id}`, 'PATCH', { content: `v${i}`, expected_revision: currentBody.draft.revision }, cookie),
        routeParams(draft.id)
      );
    }
    const versionCount = await db.execute<{ count: string }>(
      TENANT_A,
      `SELECT COUNT(*)::text AS count FROM "DocumentVersion" WHERE envelope_id IN (SELECT id FROM "DocumentEnvelope" WHERE tenant_id = $1)`,
      [TENANT_A]
    );
    // The draft flow never touches DocumentEnvelope/DocumentVersion at
    // all in Phase 2 — this asserts that stays true regardless of how
    // many autosave writes happened above.
    expect(Number(versionCount[0].count)).toBe(0);
  });

  test('PATCH rejects malformed JSON (400)', async () => {
    const cookie = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    const draft = await createDraft(cookie);
    const request = new NextRequest(new URL(`http://localhost/api/documents/drafts/${draft.id}`), {
      method: 'PATCH',
      headers: { origin: 'http://localhost:3000', cookie, 'content-type': 'application/json' },
      body: '{not valid json',
    });
    const response = await AUTOSAVE_DRAFT(request, routeParams(draft.id));
    expect(response.status).toBe(400);
  });

  test('PATCH rejects an invalid draft id (400)', async () => {
    const cookie = await cookieFor(TENANT_A, USER_A, 'draft-recovery-advocate-a@nextcase.local');
    const response = await AUTOSAVE_DRAFT(
      req('/api/documents/drafts/not-a-uuid', 'PATCH', { content: 'x', expected_revision: 1 }, cookie),
      routeParams('not-a-uuid')
    );
    expect(response.status).toBe(400);
  });
});
