import { isTrustedOrigin } from '../origin-check';

function buildRequest(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/whatever', { method: 'POST', headers });
}

describe('isTrustedOrigin', () => {
  test('accepts the default allowed origin via the Origin header', () => {
    expect(isTrustedOrigin(buildRequest({ origin: 'http://localhost:3000' }))).toBe(true);
  });

  test('rejects a mismatched Origin header', () => {
    expect(isTrustedOrigin(buildRequest({ origin: 'https://attacker.example' }))).toBe(false);
  });

  test('falls back to Referer when Origin is absent', () => {
    expect(isTrustedOrigin(buildRequest({ referer: 'http://localhost:3000/login' }))).toBe(true);
  });

  test('rejects a mismatched Referer', () => {
    expect(isTrustedOrigin(buildRequest({ referer: 'https://attacker.example/x' }))).toBe(false);
  });

  test('rejects a malformed Referer', () => {
    expect(isTrustedOrigin(buildRequest({ referer: 'not a url' }))).toBe(false);
  });

  test('fails closed when neither Origin nor Referer is present', () => {
    expect(isTrustedOrigin(buildRequest({}))).toBe(false);
  });

  test('honors ALLOWED_ORIGINS when configured', () => {
    const original = process.env.ALLOWED_ORIGINS;
    process.env.ALLOWED_ORIGINS = 'https://app.nextcase.in, https://staging.nextcase.in';
    try {
      expect(isTrustedOrigin(buildRequest({ origin: 'https://app.nextcase.in' }))).toBe(true);
      expect(isTrustedOrigin(buildRequest({ origin: 'https://staging.nextcase.in' }))).toBe(true);
      expect(isTrustedOrigin(buildRequest({ origin: 'http://localhost:3000' }))).toBe(false);
    } finally {
      process.env.ALLOWED_ORIGINS = original;
    }
  });
});
