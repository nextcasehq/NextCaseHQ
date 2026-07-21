/**
 * Phone number validation, normalization, and display masking for Phone OTP
 * Authentication. NextCaseHQ is an India-primary jurisdiction today (see
 * lib/documents/editor/templates.ts's `jurisdiction: 'IN'` and the
 * CountryPack table's own not-yet-driven-by-anything status) — this
 * validates and normalizes Indian mobile numbers specifically, the same
 * scope the rest of the app already operates in, rather than pulling in a
 * general-purpose international phone number library nothing else here
 * needs yet.
 *
 * Storage is always the canonical E.164 form (+91XXXXXXXXXX); the browser's
 * own formatting of what the advocate typed is never trusted.
 */

const INDIA_E164_PATTERN = /^\+91[6-9]\d{9}$/;

/**
 * Accepts common ways an Indian mobile number might be typed (with/without
 * +91 or a leading 0, with spaces/hyphens/parens) and returns the
 * canonical E.164 form, or null if it isn't a valid Indian mobile number.
 */
export function normalizePhoneNumber(input: string): string | null {
  const trimmed = input.trim();
  const digitsAndPlus = trimmed.replace(/[\s\-().]/g, '');

  let candidate = digitsAndPlus;
  if (candidate.startsWith('+91')) {
    // already prefixed
  } else if (candidate.startsWith('91') && candidate.length === 12) {
    candidate = `+${candidate}`;
  } else if (candidate.startsWith('0') && candidate.length === 11) {
    candidate = `+91${candidate.slice(1)}`;
  } else if (/^[6-9]\d{9}$/.test(candidate)) {
    candidate = `+91${candidate}`;
  }

  return INDIA_E164_PATTERN.test(candidate) ? candidate : null;
}

/** True for an already-canonical E.164 Indian mobile number. */
export function isValidE164PhoneNumber(phoneNumber: string): boolean {
  return INDIA_E164_PATTERN.test(phoneNumber);
}

/**
 * "+919876543210" -> "+91 98XXXXXX10", matching the locked spec's example
 * exactly. Only ever called with an already-normalized E.164 number.
 */
export function maskPhoneNumber(phoneNumber: string): string {
  if (!INDIA_E164_PATTERN.test(phoneNumber)) return phoneNumber;
  const national = phoneNumber.slice(3); // strip "+91"
  return `+91 ${national.slice(0, 2)}XXXXXX${national.slice(8)}`;
}
