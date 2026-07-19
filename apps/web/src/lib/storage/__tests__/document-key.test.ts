import { validateFileType, sanitizeFileName, buildObjectKey, isPreviewEligible } from '../document-key';

describe('validateFileType', () => {
  test('accepts an allowed extension case-insensitively', () => {
    expect(validateFileType('contract.PDF')).toEqual({ valid: true, contentType: 'application/pdf' });
    expect(validateFileType('notes.txt')).toEqual({ valid: true, contentType: 'text/plain' });
    expect(validateFileType('exhibit.jpg')).toEqual({ valid: true, contentType: 'image/jpeg' });
  });

  test('rejects a disallowed extension', () => {
    const result = validateFileType('malware.exe');
    expect(result.valid).toBe(false);
  });

  test('rejects a file name with no extension', () => {
    const result = validateFileType('noextension');
    expect(result.valid).toBe(false);
  });
});

describe('sanitizeFileName', () => {
  test('strips directory components (path traversal defense)', () => {
    expect(sanitizeFileName('../../etc/passwd')).not.toContain('..');
    expect(sanitizeFileName('/etc/passwd')).toBe('passwd');
  });

  test('replaces unsafe characters', () => {
    expect(sanitizeFileName('my file (final)!.pdf')).toBe('my_file__final__.pdf');
  });

  test('falls back to a default name if nothing safe remains', () => {
    expect(sanitizeFileName('///')).toBe('document');
  });
});

describe('buildObjectKey', () => {
  test('namespaces the key by tenant and document id', () => {
    const key = buildObjectKey('tenant-a', 'doc-123', 'contract.pdf');
    expect(key).toBe('tenant-a/doc-123/contract.pdf');
  });

  test('sanitizes the file name within the key', () => {
    const key = buildObjectKey('tenant-a', 'doc-123', '../../evil.pdf');
    expect(key).toBe('tenant-a/doc-123/evil.pdf');
  });
});

describe('isPreviewEligible', () => {
  test('accepts images, PDF, and plain text', () => {
    expect(isPreviewEligible('image/jpeg')).toBe(true);
    expect(isPreviewEligible('image/png')).toBe(true);
    expect(isPreviewEligible('application/pdf')).toBe(true);
    expect(isPreviewEligible('text/plain')).toBe(true);
  });

  test('rejects DOC and DOCX — download-only by design', () => {
    expect(isPreviewEligible('application/msword')).toBe(false);
    expect(isPreviewEligible('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false);
  });

  test('rejects a missing or empty content type', () => {
    expect(isPreviewEligible(null)).toBe(false);
    expect(isPreviewEligible(undefined)).toBe(false);
    expect(isPreviewEligible('')).toBe(false);
  });
});
