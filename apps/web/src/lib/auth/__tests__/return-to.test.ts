import { sanitizeReturnTo, RETURN_TO_FALLBACK } from '../return-to';

describe('sanitizeReturnTo', () => {
  test('accepts an internal absolute path', () => {
    expect(sanitizeReturnTo('/dashboard/matters/123')).toBe('/dashboard/matters/123');
  });

  test('falls back for a missing value', () => {
    expect(sanitizeReturnTo(null)).toBe(RETURN_TO_FALLBACK);
    expect(sanitizeReturnTo(undefined)).toBe(RETURN_TO_FALLBACK);
    expect(sanitizeReturnTo('')).toBe(RETURN_TO_FALLBACK);
  });

  test('rejects an absolute external URL (open redirect)', () => {
    expect(sanitizeReturnTo('https://evil.example/phish')).toBe(RETURN_TO_FALLBACK);
    expect(sanitizeReturnTo('http://evil.example')).toBe(RETURN_TO_FALLBACK);
  });

  test('rejects a protocol-relative URL', () => {
    expect(sanitizeReturnTo('//evil.example')).toBe(RETURN_TO_FALLBACK);
  });

  test('rejects a backslash-based bypass', () => {
    expect(sanitizeReturnTo('/\\evil.example')).toBe(RETURN_TO_FALLBACK);
  });

  test('rejects a path with no leading slash', () => {
    expect(sanitizeReturnTo('dashboard')).toBe(RETURN_TO_FALLBACK);
  });
});
