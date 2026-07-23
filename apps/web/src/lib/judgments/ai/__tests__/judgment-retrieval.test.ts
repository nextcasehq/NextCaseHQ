import fs from 'fs';
import path from 'path';
import { judgmentRetrievalForAI, JudgmentRetrievalService } from '../judgment-retrieval';
import { __registerProviderForTests, __unregisterProviderForTests } from '../../registry';
import type { JudgmentProvider } from '../../providers/types';
import type { JudgmentSearchRequest, JudgmentSearchResult } from '../../types';

describe('JudgmentRetrievalForAI — what the AI Agent depends on', () => {
  afterEach(() => {
    __unregisterProviderForTests('ai-test-provider');
    delete process.env.JUDGMENT_PROVIDER;
  });

  test('never imports a provider directly — only the service and the shared types', () => {
    const source = fs.readFileSync(path.join(__dirname, '../judgment-retrieval.ts'), 'utf8');
    expect(source).not.toMatch(/providers\/(?!types)/);
    expect(source).not.toMatch(/PlaceholderJudgmentProvider|IndianKanoon/i);
  });

  test('returns an empty list today, since only the placeholder provider is registered', async () => {
    const docs = await judgmentRetrievalForAI.retrieve('t1', 'u1', 'ABC vs State of Kerala');
    expect(docs).toEqual([]);
  });

  test('delegates to searchJudgments() — the same orchestration path as everything else, no parallel logic', async () => {
    class AiTestProvider implements JudgmentProvider {
      readonly id = 'ai-test-provider';
      readonly displayName = 'AI Test Provider';
      readonly requiresAttribution = false;
      readonly isPlaceholder = false;
      async search(request: JudgmentSearchRequest): Promise<JudgmentSearchResult> {
        return {
          status: 'ok',
          query: request.query,
          provider: this.id,
          documents: [
            { id: 'd1', title: 'T', court: 'C', citations: [], snippet: 's', sourceUrl: 'https://example.test', provider: this.id },
          ],
        };
      }
    }
    __registerProviderForTests('ai-test-provider', new AiTestProvider());
    process.env.JUDGMENT_PROVIDER = 'ai-test-provider';

    const service = new JudgmentRetrievalService();
    const docs = await service.retrieve('t1', 'u1', 'anything', 3);
    expect(docs).toHaveLength(1);
    expect(docs[0].provider).toBe('ai-test-provider');
  });
});
