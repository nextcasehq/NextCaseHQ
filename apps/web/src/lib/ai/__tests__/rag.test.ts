import { askQuestion } from '../rag';
import { hybridSearch } from '@/lib/search/hybrid-search';
import { getLLMProvider } from '../llm-provider';
import { DatabaseClient, closePool } from '@/lib/db/db-client';

jest.mock('@/lib/search/hybrid-search');
jest.mock('../llm-provider');

const mockedHybridSearch = hybridSearch as jest.MockedFunction<typeof hybridSearch>;
const mockedGetLLMProvider = getLLMProvider as jest.MockedFunction<typeof getLLMProvider>;

const TENANT_ID = '00000000-0000-4000-8000-000000000aa1';
const TENANT_B = '00000000-0000-4000-8000-000000000aa9';
const USER_ID = '00000000-0000-4000-8000-000000000aa2';

/**
 * AiUsageEvent is an append-only ledger — the nextcase_app role has no
 * DELETE grant on it (see db/schema.sql), so these tests can't clean it up
 * between runs the way every other table's tests do, and Matter rows once
 * referenced by a usage event can't be deleted either (matter_id has no
 * ON DELETE clause). Every Matter created below therefore uses a
 * per-test-run-unique title, and usage-metering assertions compare a
 * before/after count delta plus the most-recently-inserted row rather than
 * assuming the table (or a given tenant's slice of it) starts empty.
 */
function uniqueTitle(label: string): string {
  return `${label} ${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe('askQuestion', () => {
  const db = new DatabaseClient();

  beforeAll(async () => {
    await db.execute(TENANT_ID, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_ID,
      'Rag Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Rag Test Tenant B',
    ]);
    await db.execute(
      TENANT_ID,
      `INSERT INTO "User" (id, tenant_id, email, name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_ID, 'rag-test-user@nextcase.local', 'Rag Test User']
    );
  });

  beforeEach(() => {
    mockedHybridSearch.mockReset();
    mockedGetLLMProvider.mockReset();
  });

  afterAll(async () => {
    await closePool();
  });

  async function usageEventCount(tenantId: string): Promise<number> {
    const rows = await db.execute<{ count: number }>(
      tenantId,
      `SELECT COUNT(*)::int AS count FROM "AiUsageEvent" WHERE tenant_id = $1`,
      [tenantId]
    );
    return rows[0].count;
  }

  async function mostRecentUsageEvent(tenantId: string) {
    const rows = await db.execute<{ status: string; operation_type: string; provider: string; model: string | null }>(
      tenantId,
      `SELECT status, operation_type, provider, model FROM "AiUsageEvent" WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [tenantId]
    );
    return rows[0];
  }

  test('returns NO_CONTEXT_FOUND without calling the LLM when no chunks match and no matterId is given', async () => {
    mockedHybridSearch.mockResolvedValue([]);

    const result = await askQuestion(TENANT_ID, USER_ID, 'irrelevant question');

    expect(result).toEqual({ status: 'NO_CONTEXT_FOUND' });
    expect(mockedGetLLMProvider).not.toHaveBeenCalled();
  });

  test('grounds the answer in retrieved chunks and returns numbered sources — byte-for-byte the same prompt shape as before matter context existed', async () => {
    mockedHybridSearch.mockResolvedValue([
      { id: 'chunk-1', envelope_id: 'env-1', chunk_index: 0, content: 'The contract was breached on May 1st.', metadata: {}, score: 0.9 },
      { id: 'chunk-2', envelope_id: 'env-2', chunk_index: 1, content: 'Damages were estimated at $50,000.', metadata: {}, score: 0.8 },
    ]);

    const mockGenerate = jest.fn().mockResolvedValue({
      content: 'The contract was breached [1] resulting in damages [2].',
      usage: { inputTokens: 100, outputTokens: 20 },
      model: 'gpt-4o-mini',
    });
    mockedGetLLMProvider.mockReturnValue({ name: 'openai', generateChatCompletion: mockGenerate });

    const result = await askQuestion(TENANT_ID, USER_ID, 'What happened with the contract?');

    expect(result.status).toBe('ANSWERED');
    if (result.status !== 'ANSWERED') throw new Error('unreachable');
    expect(result.answer).toContain('[1]');
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]).toMatchObject({ index: 1, id: 'chunk-1', envelope_id: 'env-1' });
    expect(result.provider).toBe('openai');

    // The system prompt instructs grounding-only behavior, and the user
    // message includes the numbered context chunks actually retrieved —
    // exactly the same shape as before the Prompt Builder refactor, with
    // no "Matter context:" section present since no matterId was given.
    const [messages] = mockGenerate.mock.calls[0];
    expect(messages[0].role).toBe('system');
    expect(messages[1].content).toBe(
      'Context excerpts:\n\n[1] The contract was breached on May 1st.\n\n[2] Damages were estimated at $50,000.' +
        '\n\nQuestion: What happened with the contract?'
    );
    expect(messages[1].content).not.toContain('Matter context:');
  });

  test('passes the case_id through to hybridSearch for scoping', async () => {
    mockedHybridSearch.mockResolvedValue([]);
    await askQuestion(TENANT_ID, USER_ID, 'question', { caseId: 'case-123' });
    expect(mockedHybridSearch).toHaveBeenCalledWith(TENANT_ID, 'question', expect.objectContaining({ caseId: 'case-123' }));
  });

  test('a valid matterId with zero retrieved chunks still answers, grounded in Matter context alone', async () => {
    const title = uniqueTitle('Advisory Matter With No Documents');
    const matterRows = await db.execute<{ id: string }>(
      TENANT_ID,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_ID, title]
    );
    mockedHybridSearch.mockResolvedValue([]);
    const mockGenerate = jest.fn().mockResolvedValue({
      content: 'Answer grounded in matter context.',
      usage: { inputTokens: 50, outputTokens: 10 },
      model: 'gpt-4o-mini',
    });
    mockedGetLLMProvider.mockReturnValue({ name: 'openai', generateChatCompletion: mockGenerate });

    const result = await askQuestion(TENANT_ID, USER_ID, 'What matter is this?', { matterId: matterRows[0].id });

    expect(result.status).toBe('ANSWERED');
    const [messages] = mockGenerate.mock.calls[0];
    expect(messages[1].content).toContain('Matter context:');
    expect(messages[1].content).toContain(title);
    expect(messages[1].content).not.toContain('Context excerpts:');
  });

  test('a cross-tenant matterId fails closed (MatterNotFoundError) and records no usage event', async () => {
    const otherTenantMatter = await db.execute<{ id: string }>(
      TENANT_B,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_B, uniqueTitle('Tenant B Matter')]
    );
    mockedHybridSearch.mockResolvedValue([]);
    const before = await usageEventCount(TENANT_ID);

    await expect(
      askQuestion(TENANT_ID, USER_ID, 'question', { matterId: otherTenantMatter[0].id })
    ).rejects.toThrow('Matter not found');
    expect(mockedGetLLMProvider).not.toHaveBeenCalled();

    expect(await usageEventCount(TENANT_ID)).toBe(before);
  });

  test('records a SUCCESS AiUsageEvent for a real completed call', async () => {
    mockedHybridSearch.mockResolvedValue([
      { id: 'chunk-1', envelope_id: 'env-1', chunk_index: 0, content: 'Some content.', metadata: {}, score: 0.9 },
    ]);
    mockedGetLLMProvider.mockReturnValue({
      name: 'openai',
      generateChatCompletion: jest.fn().mockResolvedValue({
        content: 'answer',
        usage: { inputTokens: 10, outputTokens: 5 },
        model: 'gpt-4o-mini',
      }),
    });

    const before = await usageEventCount(TENANT_ID);
    await askQuestion(TENANT_ID, USER_ID, 'question');
    expect(await usageEventCount(TENANT_ID)).toBe(before + 1);

    const latest = await mostRecentUsageEvent(TENANT_ID);
    expect(latest.status).toBe('SUCCESS');
    expect(latest.operation_type).toBe('AI_CHAT');
    expect(latest.provider).toBe('openai');
    expect(latest.model).toBe('gpt-4o-mini');
  });

  test('records a FAILED AiUsageEvent when the provider call throws, then rethrows', async () => {
    mockedHybridSearch.mockResolvedValue([
      { id: 'chunk-1', envelope_id: 'env-1', chunk_index: 0, content: 'Some content.', metadata: {}, score: 0.9 },
    ]);
    mockedGetLLMProvider.mockReturnValue({
      name: 'openai',
      generateChatCompletion: jest.fn().mockRejectedValue(new Error('upstream failure')),
    });

    const before = await usageEventCount(TENANT_ID);
    await expect(askQuestion(TENANT_ID, USER_ID, 'question')).rejects.toThrow('upstream failure');
    expect(await usageEventCount(TENANT_ID)).toBe(before + 1);

    const latest = await mostRecentUsageEvent(TENANT_ID);
    expect(latest.status).toBe('FAILED');
  });
});
