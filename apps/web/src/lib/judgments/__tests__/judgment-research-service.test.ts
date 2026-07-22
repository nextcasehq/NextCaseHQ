import { searchJudgments } from '../judgment-research-service';
import { __registerProviderForTests, __unregisterProviderForTests } from '../registry';
import { InMemoryUsageTracker, __setUsageTrackerForTests } from '../usage-tracking';
import type { JudgmentProvider } from '../providers/types';
import type { JudgmentSearchRequest, JudgmentSearchResult } from '../types';

describe('searchJudgments — the one orchestration entry point', () => {
  let tracker: InMemoryUsageTracker;

  beforeEach(() => {
    tracker = new InMemoryUsageTracker();
    __setUsageTrackerForTests(tracker);
  });

  afterEach(() => {
    __unregisterProviderForTests('throwing-test-provider');
    delete process.env.JUDGMENT_PROVIDER;
  });

  test('with only the placeholder provider registered, returns an honest "unavailable" result — never fabricated documents', async () => {
    const result = await searchJudgments({ query: 'ABC vs State of Kerala', tenantId: 't1', userId: 'u1' });
    expect(result.status).toBe('unavailable');
    expect(result.documents).toEqual([]);
    expect(result.provider).toBe('placeholder');
  });

  test('records a usage event for every search, success or not', async () => {
    await searchJudgments({ query: 'Matter 42/2025', tenantId: 't1', userId: 'u1' });
    expect(tracker.getAll()).toHaveLength(1);
    expect(tracker.getAll()[0]).toMatchObject({ tenantId: 't1', userId: 'u1', providerId: 'placeholder', query: 'Matter 42/2025' });
  });

  test('a provider that throws never propagates — the service degrades to a graceful "error" result', async () => {
    class ThrowingProvider implements JudgmentProvider {
      readonly id = 'throwing-test-provider';
      readonly displayName = 'Throwing Test Provider';
      readonly requiresAttribution = false;
      readonly isPlaceholder = false;
      async search(_request: JudgmentSearchRequest): Promise<JudgmentSearchResult> {
        throw new Error('simulated provider failure');
      }
    }
    __registerProviderForTests('throwing-test-provider', new ThrowingProvider());
    process.env.JUDGMENT_PROVIDER = 'throwing-test-provider';

    await expect(
      searchJudgments({ query: 'anything', tenantId: 't1', userId: 'u1' })
    ).resolves.toMatchObject({ status: 'error', documents: [] });
  });

  test('still records usage (as an error event) even when the provider throws', async () => {
    class ThrowingProvider implements JudgmentProvider {
      readonly id = 'throwing-test-provider';
      readonly displayName = 'Throwing Test Provider';
      readonly requiresAttribution = false;
      readonly isPlaceholder = false;
      async search(_request: JudgmentSearchRequest): Promise<JudgmentSearchResult> {
        throw new Error('simulated provider failure');
      }
    }
    __registerProviderForTests('throwing-test-provider', new ThrowingProvider());
    process.env.JUDGMENT_PROVIDER = 'throwing-test-provider';

    await searchJudgments({ query: 'anything', tenantId: 't1', userId: 'u1' });
    expect(tracker.getAll()).toHaveLength(1);
    expect(tracker.getAll()[0].resultStatus).toBe('error');
  });

  test('never returns a document unless a real (non-placeholder) provider is configured — proving the "connect a provider later" seam works end to end', async () => {
    class RealishProvider implements JudgmentProvider {
      readonly id = 'realish-test-provider';
      readonly displayName = 'Realish Test Provider';
      readonly requiresAttribution = true;
      readonly isPlaceholder = false;
      async search(request: JudgmentSearchRequest): Promise<JudgmentSearchResult> {
        return {
          status: 'ok',
          query: request.query,
          provider: this.id,
          documents: [
            {
              id: 'doc-1',
              title: 'Test Judgment',
              court: 'Test Court',
              citations: [],
              snippet: 'snippet',
              sourceUrl: 'https://example.test/doc-1',
              provider: this.id,
            },
          ],
        };
      }
    }
    __registerProviderForTests('realish-test-provider', new RealishProvider());
    process.env.JUDGMENT_PROVIDER = 'realish-test-provider';

    const result = await searchJudgments({ query: 'anything', tenantId: 't1', userId: 'u1' });
    expect(result.status).toBe('ok');
    expect(result.documents).toHaveLength(1);
    expect(result.provider).toBe('realish-test-provider');

    __unregisterProviderForTests('realish-test-provider');
  });
});
