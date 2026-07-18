import { POST } from '../route';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';

describe('POST /api/auth/logout', () => {
  test('clears the session cookie', async () => {
    const response = await POST();
    expect(response.status).toBe(200);

    const setCookie = response.headers.get('set-cookie') || '';
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toMatch(/Max-Age=0/i);
  });
});
