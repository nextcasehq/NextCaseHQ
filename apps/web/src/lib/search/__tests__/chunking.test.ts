import { chunkText } from '../chunking';

describe('chunkText', () => {
  test('returns an empty array for empty/whitespace-only input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\t  ')).toEqual([]);
  });

  test('returns a single chunk when text fits within chunkSize', () => {
    expect(chunkText('a short document', { chunkSize: 1000, overlap: 100 })).toEqual(['a short document']);
  });

  test('splits longer text into overlapping chunks', () => {
    const text = 'x'.repeat(250);
    const chunks = chunkText(text, { chunkSize: 100, overlap: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk except the last is exactly chunkSize; consecutive chunks overlap by `overlap` characters.
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[0].slice(-20)).toBe(chunks[1].slice(0, 20));
  });

  test('the last chunk covers the remainder of the text exactly', () => {
    const text = 'y'.repeat(230);
    const chunks = chunkText(text, { chunkSize: 100, overlap: 20 });
    const joinedTail = chunks[chunks.length - 1];
    expect(text.endsWith(joinedTail)).toBe(true);
  });

  test('throws when overlap is not smaller than chunkSize', () => {
    expect(() => chunkText('anything', { chunkSize: 50, overlap: 50 })).toThrow();
  });
});
