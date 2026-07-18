/**
 * Pluggable content-extraction seam for the indexing pipeline. Only plain
 * text is supported today — OCR and binary document parsing (PDF/DOC/
 * images) are explicitly out of scope for this milestone. Adding support
 * for another content type later means adding a branch here, not
 * redesigning the indexing pipeline that calls this.
 */
export function extractPlainText(buffer: Buffer, contentType: string | undefined): string | null {
  if (contentType === 'text/plain') {
    return buffer.toString('utf-8');
  }
  return null;
}
