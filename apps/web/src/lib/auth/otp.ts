import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * OTP generation and hashing for Phone OTP Authentication — the same
 * hash-and-compare shape as lib/auth/password.ts (bcrypt, never store the
 * plaintext value), applied to a 6-digit numeric code instead of a
 * password. Kept as its own module rather than folded into password.ts
 * since an OTP's lifecycle (generate, short expiry, single use) is
 * distinct from a password's.
 */

const SALT_ROUNDS = 12;
const OTP_LENGTH = 6;

/** Cryptographically random 6-digit code, zero-padded (e.g. "042917"). */
export function generateOtp(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, SALT_ROUNDS);
}

export async function verifyOtp(otp: string, otpHash: string | null | undefined): Promise<boolean> {
  if (!otpHash) return false;
  return bcrypt.compare(otp, otpHash);
}
