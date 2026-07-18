import { askQuestion } from '../rag';
import { hybridSearch } from '@/lib/search/hybrid-search';
import { getLLMProvider } from '../llm-provider';

jest.mock('@/lib/search/hybrid-search');
jest.mock('../llm-provider');

const mockedHybridSearch = hybridSearch as jest.MockedFunction<typeof hybridSearch>;
const mockedGetLLMProvider = getLLMProvider as jest.MockedFunction<typeof getLLMProvider>;

const TENANT_ID = '00000000-0000-4000-8000-000000000aa1';

describe('askQuestion', () => {
  beforeEach(() => {
    mockedHybridSearch.mockReset();
    mockedGetLLMProvider.mockReset();
  });

  test('returns NO_CONTEXT_FOUND without calling the LLM when no chunks match', async () => {
    mockedHybridSearch.mockResolvedValue([]);

    const result = await askQuestion(TENANT_ID, 'irrelevant question');

    expect(result).toEqual({ status: 'NO_CONTEXT_FOUND' });
    expect(mockedGetLLMProvider).not.toHaveBeenCalled();
  });

  test('grounds the answer in retrieved chunks and returns numbered sources', async () => {
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

    const result = await askQuestion(TENANT_ID, 'What happened with the contract?');

    expect(result.status).toBe('ANSWERED');
    if (result.status !== 'ANSWERED') throw new Error('unreachable');
    expect(result.answer).toContain('[1]');
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0]).toMatchObject({ index: 1, id: 'chunk-1', envelope_id: 'env-1' });
    expect(result.provider).toBe('openai');

    // The system prompt instructs grounding-only behavior, and the user
    // message includes the numbered context chunks actually retrieved.
    const [messages] = mockGenerate.mock.calls[0];
    expect(messages[0].role).toBe('system');
    expect(messages[1].content).toContain('[1] The contract was breached on May 1st.');
    expect(messages[1].content).toContain('[2] Damages were estimated at $50,000.');
  });

  test('passes the case_id through to hybridSearch for scoping', async () => {
    mockedHybridSearch.mockResolvedValue([]);
    await askQuestion(TENANT_ID, 'question', 'case-123');
    expect(mockedHybridSearch).toHaveBeenCalledWith(TENANT_ID, 'question', expect.objectContaining({ caseId: 'case-123' }));
  });
});
