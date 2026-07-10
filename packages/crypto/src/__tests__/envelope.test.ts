import { encryptDocumentEnvelope, decryptDocumentEnvelope } from '../envelope';

describe('Zero-Knowledge Cryptographic Lifecycle', () => {
  test('should encrypt and decrypt a document buffer correctly', async () => {
    const originalText = "NextCaseHQ Secure Legal Document Content";
    const encoder = new TextEncoder();
    const originalBuffer = encoder.encode(originalText).buffer as ArrayBuffer;

    const { encryptedData, iv, encryptedDEK } = await encryptDocumentEnvelope(originalBuffer);

    expect(encryptedData).toBeDefined();
    expect(iv).toHaveLength(12);
    expect(encryptedDEK).toBeDefined();

    const decryptedBuffer = await decryptDocumentEnvelope(encryptedData, iv, encryptedDEK);
    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decryptedBuffer);

    expect(decryptedText).toBe(originalText);
  });

  test('should fail decryption with incorrect IV', async () => {
    const originalBuffer = new Uint8Array([1, 2, 3, 4]).buffer as ArrayBuffer;
    const { encryptedData, iv, encryptedDEK } = await encryptDocumentEnvelope(originalBuffer);

    const tamperedIV = new Uint8Array(iv);
    tamperedIV[0] = tamperedIV[0] ^ 0xFF;

    await expect(decryptDocumentEnvelope(encryptedData, tamperedIV, encryptedDEK))
      .rejects.toThrow("CRYPTOGRAPHIC_FAILURE: Decryption attempt failed securely.");
  });
});
