/**
 * NCHQ Module 4 & 18: Zero-Knowledge Cryptographic Lifecycle & Key Management
 * Production-grade Cryptographic Utility (Agnostic Browser/Node Context)
 */

// Refined runtime context fallback for test environments
const cryptoEngine = typeof window !== 'undefined'
  ? window.crypto.subtle
  : (typeof global !== 'undefined' ? (require('crypto').webcrypto?.subtle) : undefined);

const cryptoRandom = typeof window !== 'undefined'
  ? window.crypto
  : (typeof global !== 'undefined' ? (require('crypto').webcrypto) : undefined);

const SIMULATED_KEK_TOKEN = "NCHQ-KEK-PHASE-1-SIMULATED";

/**
 * Encrypts a document buffer using AES-GCM 256.
 */
export async function encryptDocumentEnvelope(fileBuffer: ArrayBuffer): Promise<{
  encryptedData: ArrayBuffer;
  iv: Uint8Array;
  encryptedDEK: ArrayBuffer;
}> {
  if (!cryptoEngine || !cryptoRandom) {
    throw new Error("CRYPTOGRAPHIC_FAILURE: No secure cryptographic engine found.");
  }

  try {
    // 1. Generate DEK
    const dek = await cryptoEngine.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // 2. Generate IV (Explicitly using Uint8Array as per directive)
    const iv = cryptoRandom.getRandomValues(new Uint8Array(12));

    // 3. Encrypt file buffer
    const encryptedData = await cryptoEngine.encrypt(
      { name: "AES-GCM", iv },
      dek,
      fileBuffer
    );

    // 4. Export DEK for wrapping
    const rawDEK = await cryptoEngine.exportKey("raw", dek);

    // 5. Wrap DEK (Simulated KEK)
    const encryptedDEK = await simulateKEKWrap(rawDEK);

    return {
      encryptedData,
      iv,
      encryptedDEK,
    };
  } catch (error) {
    throw new Error("CRYPTOGRAPHIC_FAILURE: Failed to encrypt document envelope securely.");
  }
}

/**
 * Decrypts a document envelope using the provided IV and encrypted DEK.
 */
export async function decryptDocumentEnvelope(
  encryptedData: ArrayBuffer,
  iv: Uint8Array,
  encryptedDEK: ArrayBuffer
): Promise<ArrayBuffer> {
  if (!cryptoEngine) {
    throw new Error("CRYPTOGRAPHIC_FAILURE: No secure cryptographic engine found.");
  }

  try {
    // 1. Unwrap DEK
    const rawDEK = await simulateKEKUnwrap(encryptedDEK);

    // 2. Import DEK
    const dek = await cryptoEngine.importKey(
      "raw",
      rawDEK,
      "AES-GCM",
      true,
      ["decrypt"]
    );

    // 3. Decrypt data
    const decryptedData = await cryptoEngine.decrypt(
      { name: "AES-GCM", iv },
      dek,
      encryptedData
    );

    return decryptedData as ArrayBuffer;
  } catch (error) {
    throw new Error("CRYPTOGRAPHIC_FAILURE: Decryption attempt failed securely.");
  }
}

async function simulateKEKWrap(rawKey: ArrayBuffer): Promise<ArrayBuffer> {
  const tokenEncoder = new TextEncoder();
  const tokenBytes = tokenEncoder.encode(SIMULATED_KEK_TOKEN);
  const wrapped = new Uint8Array(rawKey.byteLength);
  const keyBytes = new Uint8Array(rawKey);

  for (let i = 0; i < keyBytes.length; i++) {
    wrapped[i] = keyBytes[i] ^ tokenBytes[i % tokenBytes.length];
  }
  // Explicitly casting to satisfy strict ArrayBuffer types
  return (wrapped.buffer as any) as ArrayBuffer;
}

async function simulateKEKUnwrap(wrappedKey: ArrayBuffer): Promise<ArrayBuffer> {
  return simulateKEKWrap(wrappedKey);
}
