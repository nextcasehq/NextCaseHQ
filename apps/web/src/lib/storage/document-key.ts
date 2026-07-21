/**
 * File-type allowlist and object-key generation for document uploads.
 * Kept separate from object-storage.ts (the provider-agnostic S3 client)
 * since this logic is about what we accept and how we name objects, not
 * how we talk to storage.
 */

export const ALLOWED_DOCUMENT_EXTENSIONS: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

export interface FileTypeValidationResult {
  valid: boolean;
  contentType?: string;
  reason?: string;
}

export function validateFileType(fileName: string): FileTypeValidationResult {
  const match = /\.[^.]+$/.exec(fileName.toLowerCase());
  if (!match) {
    return { valid: false, reason: 'File name has no extension.' };
  }
  const extension = match[0];
  const contentType = ALLOWED_DOCUMENT_EXTENSIONS[extension];
  if (!contentType) {
    return { valid: false, reason: `Unsupported file type: ${extension}` };
  }
  return { valid: true, contentType };
}

/** Strips path separators and anything but a conservative safe character set, preventing path traversal in the generated object key. */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.replace(/^.*[\\/]/, '');
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
  return cleaned || 'document';
}

/**
 * Tenant-namespaced key: defense-in-depth even though DocumentEnvelope rows
 * are already RLS-scoped by tenant_id — a leaked/misrouted key still can't
 * be confused with another tenant's object.
 *
 * The version segment (Sprint 3, PR 3A) means every version of a Document
 * lives at its own key — uploading version 2 can never clobber version 1's
 * bytes, even before either database row exists.
 */
export function buildObjectKey(tenantId: string, documentId: string, fileName: string, versionNumber: number): string {
  return `${tenantId}/${documentId}/v${versionNumber}/${sanitizeFileName(fileName)}`;
}
