import { normalizePhoneNumber, isValidE164PhoneNumber, maskPhoneNumber } from '../phone';

describe('normalizePhoneNumber', () => {
  test('accepts an already-canonical E.164 number', () => {
    expect(normalizePhoneNumber('+919876543210')).toBe('+919876543210');
  });

  test('accepts a bare 10-digit mobile number and adds +91', () => {
    expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
  });

  test('accepts a leading-0 national format', () => {
    expect(normalizePhoneNumber('09876543210')).toBe('+919876543210');
  });

  test('accepts a 91-prefixed number with no plus sign', () => {
    expect(normalizePhoneNumber('919876543210')).toBe('+919876543210');
  });

  test('strips spaces, hyphens, and parentheses before validating', () => {
    expect(normalizePhoneNumber('+91 98765-43210')).toBe('+919876543210');
    expect(normalizePhoneNumber('(+91) 9876543210')).toBe('+919876543210');
  });

  test('rejects a number that does not start with a valid Indian mobile prefix (6-9)', () => {
    expect(normalizePhoneNumber('+915876543210')).toBeNull();
  });

  test('rejects too few or too many digits', () => {
    expect(normalizePhoneNumber('+9198765432')).toBeNull();
    expect(normalizePhoneNumber('+91987654321099')).toBeNull();
  });

  test('rejects garbage input', () => {
    expect(normalizePhoneNumber('not a phone number')).toBeNull();
    expect(normalizePhoneNumber('')).toBeNull();
  });

  test('rejects a non-Indian country code rather than guessing', () => {
    expect(normalizePhoneNumber('+14155552671')).toBeNull();
  });
});

describe('isValidE164PhoneNumber', () => {
  test('true for a canonical Indian mobile E.164 number', () => {
    expect(isValidE164PhoneNumber('+919876543210')).toBe(true);
  });

  test('false for anything not already canonical', () => {
    expect(isValidE164PhoneNumber('9876543210')).toBe(false);
    expect(isValidE164PhoneNumber('+91 9876543210')).toBe(false);
  });
});

describe('maskPhoneNumber', () => {
  test('matches the locked spec\'s exact example', () => {
    expect(maskPhoneNumber('+919876543210')).toBe('+91 98XXXXXX10');
  });

  test('never reveals the middle 6 digits', () => {
    const masked = maskPhoneNumber('+919123456780');
    expect(masked).not.toContain('234567');
  });
});
