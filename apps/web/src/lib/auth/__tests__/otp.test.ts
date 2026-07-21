import { generateOtp, hashOtp, verifyOtp } from '../otp';

describe('generateOtp', () => {
  test('produces a 6-digit numeric string', () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });

  test('is not the same value every time (cryptographically random, not a fixed constant)', () => {
    const samples = new Set(Array.from({ length: 20 }, () => generateOtp()));
    expect(samples.size).toBeGreaterThan(1);
  });
});

describe('hashOtp / verifyOtp', () => {
  test('a hashed OTP verifies successfully against the same plaintext code', async () => {
    const otp = generateOtp();
    const hash = await hashOtp(otp);
    expect(await verifyOtp(otp, hash)).toBe(true);
  });

  test('never stores the plaintext code — the hash never equals the code itself', async () => {
    const otp = generateOtp();
    const hash = await hashOtp(otp);
    expect(hash).not.toBe(otp);
    expect(hash).not.toContain(otp);
  });

  test('a wrong code fails verification', async () => {
    const hash = await hashOtp('123456');
    expect(await verifyOtp('654321', hash)).toBe(false);
  });

  test('a missing hash never verifies (never throws for a null/undefined hash)', async () => {
    expect(await verifyOtp('123456', null)).toBe(false);
    expect(await verifyOtp('123456', undefined)).toBe(false);
  });
});
