import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';

const TENANT_A = '00000000-0000-4000-8000-0000000f0a01';
const USER_ID = '00000000-0000-4000-8000-0000000f0a02';

async function sessionCookieHeader(): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId: TENANT_A, email: 'judgment-research-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(url: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL(url), { headers });
}

describe('GET /api/judgments/search — Judgment Research (architecture-only milestone)', () => {
  test('rejects with no session (401)', async () => {
    const res = await GET(buildRequest('http://localhost/api/judgments/search?q=quashing%20FIR', {}));
    expect(res.status).toBe(401);
  });

  test('rejects a missing q parameter with 400', async () => {
    const res = await GET(buildRequest('http://localhost/api/judgments/search', { cookie: await sessionCookieHeader() }));
    expect(res.status).toBe(400);
  });

  test('a real, authenticated request resolves to the honest "unavailable" status — the placeholder provider, not fabricated results', async () => {
    const res = await GET(
      buildRequest('http://localhost/api/judgments/search?q=quashing%20FIR%20under%20section%20482', {
        cookie: await sessionCookieHeader(),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('unavailable');
    expect(body.provider).toBe('placeholder');
    expect(body.documents).toEqual([]);
    expect(typeof body.message).toBe('string');
    expect(body.message.length).toBeGreaterThan(0);
  });

  test('never returns a document, even in shape, when unavailable', async () => {
    const res = await GET(
      buildRequest('http://localhost/api/judgments/search?q=anything', { cookie: await sessionCookieHeader() })
    );
    const body = await res.json();
    expect(Array.isArray(body.documents)).toBe(true);
    expect(body.documents.length).toBe(0);
  });
});
