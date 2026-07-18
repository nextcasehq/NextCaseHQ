import { POST } from '../route';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/security/admin-session';

const TRUSTED_ORIGIN = 'http://localhost:3000';

function buildRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/admin/logout', {
    method: 'POST',
    headers: { origin: TRUSTED_ORIGIN, ...headers },
  });
}

describe('POST /api/admin/logout', () => {
  test('clears the admin session cookie', async () => {
    const response = await POST(buildRequest());
    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain(`${ADMIN_SESSION_COOKIE_NAME}=;`);
    expect(setCookie.toLowerCase()).toContain('max-age=0');
  });

  test('rejects a request from an untrusted origin', async () => {
    const response = await POST(buildRequest({ origin: 'https://attacker.example' }));
    expect(response.status).toBe(403);
  });
});
