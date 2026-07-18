import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

/**
 * Returns false (rather than throwing) for a missing/null hash, so a user
 * row with no password set (e.g. seeded without one) simply can never
 * authenticate instead of causing a 500.
 */
export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string | null | undefined
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }
  return bcrypt.compare(plainTextPassword, passwordHash);
}
