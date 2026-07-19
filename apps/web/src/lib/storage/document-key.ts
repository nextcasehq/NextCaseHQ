/**
 * File-type allowlist and object-key generation for document uploads.
 * Kept separate from object-storage.ts (the provider-agnostic S3 client)
 * since this logic is about what we accept and how we name objects, not
 * how we talk to storage.
 */

/** Shared by the upload route and the versions route so the two never drift apart. */
export const MAX_DOCUMENT_SIZE_BYTES = 128 * 1024 * 1024; // 128MB

export const ALLOWED_DOCUMENT_EXTENSIONS: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

/**
 * Which of the 7 allowed upload content types (above) can be rendered
 * inline by a browser with zero conversion (Sprint 3B, PR 3B-2). DOC/DOCX
 * are deliberately excluded — no browser-native renderer exists for them
 * and a conversion service is out of scope for this milestone — so those
 * two remain download-only, with an explicit, testable "unsupported
 * preview" response rather than a silent failure.
 */
const PREVIEW_ELIGIBLE_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf', 'text/plain']);

export function isPreviewEligible(contentType: string | null | undefined): boolean {
  return !!contentType && PREVIEW_ELIGIBLE_CONTENT_TYPES.has(contentType);
}

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

/** Tenant-namespaced key: defense-in-depth even though DocumentEnvelope rows are already RLS-scoped by tenant_id — a leaked/misrouted key still can't be confused with another tenant's object. */
export function buildObjectKey(tenantId: string, documentId: string, fileName: string): string {
  return `${tenantId}/${documentId}/${sanitizeFileName(fileName)}`;
}

/**
 * Distinct key per version, nested under the same tenant/document prefix
 * as buildObjectKey — every version is its own independently-addressable
 * object, never overwriting a prior version's bytes, so DocumentVersion
 * history stays real (not just metadata pointing at the same object).
 *
 * Takes a caller-generated unique token rather than the version_number
 * itself: the object must be written to storage before the DB assigns
 * that number (it's computed atomically inside the insert, to keep two
 * concurrent uploads for the same document from racing to the same
 * "next" number), so nothing tying storage identity to it is available
 * yet at key-generation time.
 */
export function buildVersionObjectKey(
  tenantId: string,
  documentId: string,
  versionToken: string,
  fileName: string
): string {
  return `${tenantId}/${documentId}/versions/${versionToken}-${sanitizeFileName(fileName)}`;
}
