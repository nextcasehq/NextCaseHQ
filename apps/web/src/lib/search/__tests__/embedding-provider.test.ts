import { getEmbeddingProvider, __resetEmbeddingProviderForTests, EMBEDDING_DIMENSIONS } from '../embedding-provider';

describe('getEmbeddingProvider (local-hashing fallback)', () => {
  const originalBaseUrl = process.env.EMBEDDING_API_BASE_URL;
  const originalApiKey = process.env.EMBEDDING_API_KEY;

  beforeEach(() => {
    delete process.env.EMBEDDING_API_BASE_URL;
    delete process.env.EMBEDDING_API_KEY;
    __resetEmbeddingProviderForTests();
  });

  afterAll(() => {
    if (originalBaseUrl === undefined) delete process.env.EMBEDDING_API_BASE_URL;
    else process.env.EMBEDDING_API_BASE_URL = originalBaseUrl;
    if (originalApiKey === undefined) delete process.env.EMBEDDING_API_KEY;
    else process.env.EMBEDDING_API_KEY = originalApiKey;
    __resetEmbeddingProviderForTests();
  });

  test('falls back to the local-hashing provider when unconfigured', () => {
    expect(getEmbeddingProvider().name).toBe('local-hashing');
  });

  test('produces a vector of the fixed EMBEDDING_DIMENSIONS length', async () => {
    const embedding = await getEmbeddingProvider().generateEmbedding('breach of contract damages');
    expect(embedding).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  test('is deterministic for the same input', async () => {
    const provider = getEmbeddingProvider();
    const a = await provider.generateEmbedding('breach of contract');
    const b = await provider.generateEmbedding('breach of contract');
    expect(a).toEqual(b);
  });

  test('produces a unit-normalized vector for non-empty text', async () => {
    const embedding = await getEmbeddingProvider().generateEmbedding('some real legal text');
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  test('shares more cosine similarity between related text than unrelated text', async () => {
    const provider = getEmbeddingProvider();
    const cosine = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);

    const query = await provider.generateEmbedding('breach of contract damages');
    const related = await provider.generateEmbedding('the defendant breached the contract causing damages');
    const unrelated = await provider.generateEmbedding('quarterly tax filing deadline for small businesses');

    expect(cosine(query, related)).toBeGreaterThan(cosine(query, unrelated));
  });
});

describe('getEmbeddingProvider (HTTP provider selection)', () => {
  const originalBaseUrl = process.env.EMBEDDING_API_BASE_URL;
  const originalApiKey = process.env.EMBEDDING_API_KEY;

  afterEach(() => {
    if (originalBaseUrl === undefined) delete process.env.EMBEDDING_API_BASE_URL;
    else process.env.EMBEDDING_API_BASE_URL = originalBaseUrl;
    if (originalApiKey === undefined) delete process.env.EMBEDDING_API_KEY;
    else process.env.EMBEDDING_API_KEY = originalApiKey;
    __resetEmbeddingProviderForTests();
  });

  test('selects the HTTP provider when both base URL and API key are set', () => {
    process.env.EMBEDDING_API_BASE_URL = 'https://example-embeddings.test/v1';
    process.env.EMBEDDING_API_KEY = 'test-key';
    __resetEmbeddingProviderForTests();
    expect(getEmbeddingProvider().name).toBe('http');
  });
});
