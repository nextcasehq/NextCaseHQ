import { POST } from '../route';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';

function buildRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/auth/logout', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', ...headers },
  });
}

describe('POST /api/auth/logout', () => {
  test('clears the session cookie', async () => {
    const response = await POST(buildRequest());
    expect(response.status).toBe(200);

    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toMatch(/Max-Age=0/i);
  });

  test('rejects a request from an untrusted origin (CSRF defense)', async () => {
    const response = await POST(buildRequest({ origin: 'https://attacker.example' }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('INVALID_ORIGIN');
  });
});
