import { NextRequest } from 'next/server';
import { POST as CREATE_DRAFT } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

const TENANT_A = '00000000-0000-4000-8000-0000000000b1';
const USER_A = '00000000-0000-4000-8000-0000000000b2';
const TENANT_B = '00000000-0000-4000-8000-0000000000b3';

async function sessionCookieHeader(tenantId: string, userId: string, email: string): Promise<string> {
  const token = await signSessionToken({ sub: userId, tenantId, email });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(path: string, method: string, body?: unknown, cookie?: string): NextRequest {
  const headers: Record<string, string> = { origin: 'http://localhost:3000' };
  if (cookie) headers.cookie = cookie;
  return new NextRequest(new URL(`http://localhost${path}`), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/documents/drafts — durable draft creation', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Draft Autosave Test Tenant A',
    ]);
    await db.execute(TENANT_A, `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [
      USER_A,
      TENANT_A,
      'draft-autosave-advocate@nextcase.local',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Draft Autosave Test Tenant B',
    ]);
  });

  afterAll(async () => {
    await closePool();
  });

  test('rejects an unauthenticated request (401)', async () => {
    const response = await CREATE_DRAFT(buildRequest('/api/documents/drafts', 'POST', { content: 'hello' }));
    expect(response.status).toBe(401);
  });

  test('creates a draft with no matter/document type (a brand-new, un-typed document)', async () => {
    const cookie = await sessionCookieHeader(TENANT_A, USER_A, 'draft-autosave-advocate@nextcase.local');
    const response = await CREATE_DRAFT(
      buildRequest('/api/documents/drafts', 'POST', { content: 'Draft body text.', title: 'Untitled Draft' }, cookie)
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.draft.content).toBe('Draft body text.');
    expect(body.draft.title).toBe('Untitled Draft');
    expect(body.draft.revision).toBe(1);
    expect(body.draft.matter_id).toBeNull();
  });

  test('resolves tenant and user from the server session, never from the request body', async () => {
    const cookie = await sessionCookieHeader(TENANT_A, USER_A, 'draft-autosave-advocate@nextcase.local');
    const response = await CREATE_DRAFT(
      buildRequest(
        '/api/documents/drafts',
        'POST',
        // A malicious/incorrect tenant_id or user_id in the body must be
        // ignored entirely — the schema doesn't even accept these fields.
        { content: 'x', tenant_id: TENANT_B, user_id: 'not-a-real-user' },
        cookie
      )
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.draft.tenant_id).toBe(TENANT_A);
    expect(body.draft.user_id).toBe(USER_A);
  });

  test('rejects an unrecognized document_type (400)', async () => {
    const cookie = await sessionCookieHeader(TENANT_A, USER_A, 'draft-autosave-advocate@nextcase.local');
    const response = await CREATE_DRAFT(
      buildRequest('/api/documents/drafts', 'POST', { content: 'x', document_type: 'NOT_A_REAL_TYPE' }, cookie)
    );
    expect(response.status).toBe(400);
  });

  test('rejects a matter_id that does not exist in the caller\'s tenant (404) — FK checks alone bypass RLS', async () => {
    const cookie = await sessionCookieHeader(TENANT_A, USER_A, 'draft-autosave-advocate@nextcase.local');
    const otherTenantMatter = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, 'Tenant B Matter']
    );
    const response = await CREATE_DRAFT(
      buildRequest('/api/documents/drafts', 'POST', { content: 'x', matter_id: otherTenantMatter[0].id }, cookie)
    );
    expect(response.status).toBe(404);
  });

  test('links a draft to a real Matter in the caller\'s own tenant', async () => {
    const cookie = await sessionCookieHeader(TENANT_A, USER_A, 'draft-autosave-advocate@nextcase.local');
    const matter = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Tenant A Matter']
    );
    const response = await CREATE_DRAFT(
      buildRequest('/api/documents/drafts', 'POST', { content: 'x', matter_id: matter[0].id }, cookie)
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.draft.matter_id).toBe(matter[0].id);
  });

  test('rejects malformed JSON (400)', async () => {
    const cookie = await sessionCookieHeader(TENANT_A, USER_A, 'draft-autosave-advocate@nextcase.local');
    const request = new NextRequest(new URL('http://localhost/api/documents/drafts'), {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', cookie, 'content-type': 'application/json' },
      body: '{not valid json',
    });
    const response = await CREATE_DRAFT(request);
    expect(response.status).toBe(400);
  });
});
