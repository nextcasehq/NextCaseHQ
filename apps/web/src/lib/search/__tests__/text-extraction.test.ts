import { extractPlainText } from '../text-extraction';

describe('extractPlainText', () => {
  test('decodes text/plain content as UTF-8', () => {
    expect(extractPlainText(Buffer.from('hello world'), 'text/plain')).toBe('hello world');
  });

  test('returns null for unsupported content types (pending OCR/parsers)', () => {
    expect(extractPlainText(Buffer.from('%PDF-1.4 ...'), 'application/pdf')).toBeNull();
    expect(extractPlainText(Buffer.from('fake docx bytes'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBeNull();
    expect(extractPlainText(Buffer.from('fake image bytes'), 'image/png')).toBeNull();
  });

  test('returns null when content type is missing', () => {
    expect(extractPlainText(Buffer.from('hello'), undefined)).toBeNull();
  });
});
