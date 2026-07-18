/**
 * Provider-agnostic embedding generation — same lazy-singleton,
 * "no hardcoded vendor" pattern as lib/storage/object-storage.ts and
 * lib/security/redis-client.ts.
 *
 * Real semantic embeddings come from any HTTP endpoint that implements the
 * widely-adopted OpenAI embeddings API shape
 * (POST {base}/embeddings -> { data: [{ embedding: number[] }] }) —
 * supported by OpenAI itself and most self-hosted/open serving layers
 * (vLLM, Ollama's OpenAI-compatible mode, LiteLLM, etc). Configure via
 * EMBEDDING_API_BASE_URL / EMBEDDING_API_KEY / EMBEDDING_MODEL.
 *
 * When unconfigured, a deterministic local "feature hashing" provider is
 * used instead so indexing and hybrid search are fully exercisable in
 * dev/CI without a live AI vendor key. It is a real (if crude) embedding
 * technique — shared vocabulary lands in the same output dimensions, so
 * related text gets non-trivial cosine similarity — but it is NOT
 * semantically meaningful the way a trained model's output is. Production
 * deployments should set EMBEDDING_API_BASE_URL/EMBEDDING_API_KEY for real
 * similarity search quality.
 */

// Fixed at the schema level (DocumentChunkVector.embedding is vector(1536))
// — pgvector requires a fixed column dimension, so swapping to a provider
// with a different native output size requires either an EMBEDDING_
// provider that supports truncating/padding to this exact size (e.g. the
// OpenAI `dimensions` request parameter) or a follow-up schema migration.
export const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingProvider {
  readonly name: string;
  generateEmbedding(text: string): Promise<number[]>;
}

class HttpEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'http';

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: text, dimensions: EMBEDDING_DIMENSIONS }),
    });

    if (!response.ok) {
      throw new Error(`EMBEDDING_PROVIDER_ERROR: HTTP ${response.status} from embedding provider.`);
    }

    const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
    const embedding = payload.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `EMBEDDING_DIMENSION_MISMATCH: expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding?.length ?? 'none'}.`
      );
    }
    return embedding;
  }
}

/**
 * Deterministic local fallback: a classic "hashing trick" bag-of-words
 * embedding (feature hashing). Real, testable, no external calls.
 */
class LocalHashingEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'local-hashing';

  async generateEmbedding(text: string): Promise<number[]> {
    const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    for (const token of tokens) {
      const hash = hashToken(token);
      const index = hash % EMBEDDING_DIMENSIONS;
      const sign = hash % 2 === 0 ? 1 : -1;
      vector[index] += sign;
    }

    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map((v) => v / magnitude);
  }
}

function hashToken(token: string): number {
  let hash = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < token.length; i++) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

let provider: EmbeddingProvider | undefined;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (provider) return provider;

  const baseUrl = process.env.EMBEDDING_API_BASE_URL;
  const apiKey = process.env.EMBEDDING_API_KEY;
  const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

  provider =
    baseUrl && apiKey ? new HttpEmbeddingProvider(baseUrl, apiKey, model) : new LocalHashingEmbeddingProvider();
  return provider;
}

/** Test-only: force re-evaluation of EMBEDDING_* env vars / a fresh provider instance. */
export function __resetEmbeddingProviderForTests(): void {
  provider = undefined;
}
