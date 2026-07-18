import { checkRateLimit, getClientIdentifier, __resetRateLimitForTests } from '../rate-limit';

beforeEach(() => {
  __resetRateLimitForTests();
});

describe('checkRateLimit', () => {
  test('allows requests under the limit', () => {
    const result = checkRateLimit('key-a', 3, 60_000);
    expect(result.allowed).toBe(true);
  });

  test('blocks once the limit is reached within the window', () => {
    checkRateLimit('key-b', 2, 60_000);
    checkRateLimit('key-b', 2, 60_000);
    const third = checkRateLimit('key-b', 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('different keys are tracked independently', () => {
    checkRateLimit('key-c', 1, 60_000);
    const otherKey = checkRateLimit('key-d', 1, 60_000);
    expect(otherKey.allowed).toBe(true);
  });

  test('resets after the window elapses', () => {
    checkRateLimit('key-e', 1, 10); // 10ms window
    const blocked = checkRateLimit('key-e', 1, 10);
    expect(blocked.allowed).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const afterWindow = checkRateLimit('key-e', 1, 10);
        expect(afterWindow.allowed).toBe(true);
        resolve();
      }, 20);
    });
  });
});

describe('getClientIdentifier', () => {
  test('uses the first entry of x-forwarded-for', () => {
    const req = new Request('http://localhost/x', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    });
    expect(getClientIdentifier(req)).toBe('203.0.113.5');
  });

  test('falls back to x-real-ip', () => {
    const req = new Request('http://localhost/x', { headers: { 'x-real-ip': '203.0.113.9' } });
    expect(getClientIdentifier(req)).toBe('203.0.113.9');
  });

  test('falls back to "unknown" when no proxy headers are present', () => {
    const req = new Request('http://localhost/x');
    expect(getClientIdentifier(req)).toBe('unknown');
  });
});
