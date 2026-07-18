const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 100;

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

/** Fixed-size character chunking with overlap — simple, deterministic, and sufficient for plain-text indexing. */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap ?? DEFAULT_CHUNK_OVERLAP;
  if (overlap >= chunkSize) {
    throw new Error('chunkText: overlap must be smaller than chunkSize.');
  }

  const normalized = text.trim();
  if (!normalized) return [];
  if (normalized.length <= chunkSize) return [normalized];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end === normalized.length) break;
    start = end - overlap;
  }
  return chunks;
}
