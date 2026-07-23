import {
  getJudgmentProvider,
  getRegisteredProviderIds,
  __registerProviderForTests,
  __unregisterProviderForTests,
} from '../registry';
import type { JudgmentProvider } from '../providers/types';
import type { JudgmentSearchRequest, JudgmentSearchResult } from '../types';

describe('Judgment provider registry', () => {
  afterEach(() => {
    __unregisterProviderForTests('fake-test-provider');
    delete process.env.JUDGMENT_PROVIDER;
  });

  test('only the placeholder provider is registered by default — zero dependency on any external source', () => {
    expect(getRegisteredProviderIds()).toEqual(['placeholder']);
  });

  test('resolves the placeholder provider with no configuration set', () => {
    const provider = getJudgmentProvider();
    expect(provider.id).toBe('placeholder');
  });

  test('an unknown configured provider id falls back to the placeholder rather than throwing', () => {
    process.env.JUDGMENT_PROVIDER = 'not-a-real-provider';
    const provider = getJudgmentProvider();
    expect(provider.id).toBe('placeholder');
  });

  test('registering a new provider makes it resolvable by id — proving the "add one entry" extensibility path', () => {
    class FakeProvider implements JudgmentProvider {
      readonly id = 'fake-test-provider';
      readonly displayName = 'Fake Test Provider';
      readonly requiresAttribution = true;
      readonly isPlaceholder = false;
      async search(request: JudgmentSearchRequest): Promise<JudgmentSearchResult> {
        return { status: 'ok', query: request.query, provider: this.id, documents: [] };
      }
    }
    __registerProviderForTests('fake-test-provider', new FakeProvider());
    const provider = getJudgmentProvider('fake-test-provider');
    expect(provider.id).toBe('fake-test-provider');
    expect(provider.isPlaceholder).toBe(false);
  });
});
