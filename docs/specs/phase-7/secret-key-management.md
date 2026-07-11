# Secret Management & Envelope Encryption Protocols

## 1. Abstract Key Management Interface
- **KeyProvider Interface**: Standardized API for cryptographic operations (Encrypt, Decrypt, Wrap, Unwrap).
- **Driver Support**:
  - **Cloud KMS**: Integration with AWS KMS / Google Cloud KMS.
  - **Local Vault**: HashiCorp Vault for on-premise deployments.
  - **HSM**: PKCS#11 support for hardware security modules.

## 2. Data Encryption Key (DEK) Lifecycle
- **Generation**: DEKs are generated per-tenant or per-case and encrypted (wrapped) using a master Key Encryption Key (KEK).
- **Rotation**:
  - Automated rotation of DEKs every 90 days.
  - On-demand rotation in the event of a suspected security breach.
- **Persistence**: Encrypted DEKs are stored alongside the data they protect (e.g., in the `DocumentEnvelope` metadata).

## 3. Fallback & Outage Mechanisms
- **Grace Period**: Cached KEKs (in secure memory) may be used for a maximum of 5 minutes during KMS latency spikes.
- **Circuit Breaking**: If the KMS is unavailable for >60 seconds, fail into a `SAFE_MODE` where write operations are disabled to prevent data corruption with unmanaged keys.
