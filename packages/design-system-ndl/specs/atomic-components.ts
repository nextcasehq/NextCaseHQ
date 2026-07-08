/**
 * NDL Atomic Component Specifications
 * Structural interfaces and strict TypeScript contracts.
 */

export type UIState = 'IDLE' | 'LOADING' | 'STREAMING' | 'ERRORED' | 'BOUNDARY_VIOLATION';

/**
 * 1. Ingestion Stream Dropzone
 */
export interface IngestionDropzoneProps {
  onEncryptedBinaryDrop: (payload: ArrayBuffer) => Promise<void>;
  acceptedMimeTypes: string[];
  maxFileSize: number; // Bytes
  state: UIState;
}

/**
 * 2. Evidence Integrity Indicator
 */
export interface EvidenceIntegrityProps {
  sha256Hash: string;
  ledgerLockTimestamp: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'TAMPERED';
  ariaLabel: string; // "Evidence SHA-256 Verification: [Hash]"
}

/**
 * 3. AI Response Node
 */
export interface AIResponseNodeProps {
  content: string;
  tokenCost: number; // NCHQ usage accounting
  systemPromptVersion: string; // e.g. "v2.4.1-legal-ref"
  state: UIState;
  isSigned: boolean; // Cryptographically signed by system
}

/**
 * 4. Tenant Context Switcher
 */
export interface TenantSwitcherProps {
  activeTenant: { id: string; name: string; tier: string };
  availableTenants: Array<{ id: string; name: string }>;
  onSwitchRequest: (targetId: string) => void;
}
