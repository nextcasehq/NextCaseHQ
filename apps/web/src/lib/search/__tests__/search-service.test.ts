import { runSearch, SEARCH_PROVIDER_TYPES } from '../search-service';
import { documentSearchProvider } from '../providers/document-search-provider';
import {
  clientSearchProvider,
  courtNoteSearchProvider,
  matterSearchProvider,
  proceedingSearchProvider,
} from '../providers/entity-search-provider';

jest.mock('../providers/document-search-provider');
jest.mock('../providers/entity-search-provider');

const mockedDocumentSearch = documentSearchProvider.search as jest.MockedFunction<typeof documentSearchProvider.search>;
const mockedMatterSearch = matterSearchProvider.search as jest.MockedFunction<typeof matterSearchProvider.search>;
const mockedProceedingSearch = proceedingSearchProvider.search as jest.MockedFunction<typeof proceedingSearchProvider.search>;
const mockedClientSearch = clientSearchProvider.search as jest.MockedFunction<typeof clientSearchProvider.search>;
const mockedCourtNoteSearch = courtNoteSearchProvider.search as jest.MockedFunction<typeof courtNoteSearchProvider.search>;

const TENANT_ID = '00000000-0000-4000-8000-000000000fa1';

function emptyGroup(type: string) {
  return { type, providerName: type, items: [] };
}

/**
 * runSearch() (the "Option C" Search Service's one orchestration entry
 * point) is tested here entirely against mocked providers — the providers
 * themselves are tested for real, against real Postgres, in
 * app/api/search/__tests__/route.test.ts. This file's job is to prove the
 * dispatch/parallelization/error-isolation/type-filter behavior that only
 * the service itself owns.
 */
describe('runSearch (Search Service dispatch)', () => {
  beforeEach(() => {
    mockedDocumentSearch.mockReset().mockResolvedValue(emptyGroup('DOCUMENT'));
    mockedMatterSearch.mockReset().mockResolvedValue(emptyGroup('MATTER'));
    mockedProceedingSearch.mockReset().mockResolvedValue(emptyGroup('PROCEEDING'));
    mockedClientSearch.mockReset().mockResolvedValue(emptyGroup('CLIENT'));
    mockedCourtNoteSearch.mockReset().mockResolvedValue(emptyGroup('COURT_NOTE'));
  });

  test('calls every registered provider when no type filter is given', async () => {
    await runSearch(TENANT_ID, 'contract');
    expect(mockedDocumentSearch).toHaveBeenCalledTimes(1);
    expect(mockedMatterSearch).toHaveBeenCalledTimes(1);
    expect(mockedProceedingSearch).toHaveBeenCalledTimes(1);
    expect(mockedClientSearch).toHaveBeenCalledTimes(1);
    expect(mockedCourtNoteSearch).toHaveBeenCalledTimes(1);
  });

  test('SEARCH_PROVIDER_TYPES lists exactly the registered providers', () => {
    expect([...SEARCH_PROVIDER_TYPES].sort()).toEqual(['CLIENT', 'COURT_NOTE', 'DOCUMENT', 'MATTER', 'PROCEEDING']);
  });

  test('the type filter calls only the requested providers, skipping the rest entirely', async () => {
    await runSearch(TENANT_ID, 'contract', { types: ['DOCUMENT', 'MATTER'] });
    expect(mockedDocumentSearch).toHaveBeenCalledTimes(1);
    expect(mockedMatterSearch).toHaveBeenCalledTimes(1);
    expect(mockedProceedingSearch).not.toHaveBeenCalled();
    expect(mockedClientSearch).not.toHaveBeenCalled();
    expect(mockedCourtNoteSearch).not.toHaveBeenCalled();
  });

  test('passes tenantId, query, matterId, and limit through to every provider unchanged', async () => {
    await runSearch(TENANT_ID, 'discovery', { matterId: 'matter-123', limit: 5, types: ['DOCUMENT'] });
    expect(mockedDocumentSearch).toHaveBeenCalledWith(TENANT_ID, 'discovery', { matterId: 'matter-123', limit: 5 });
  });

  test('returns groups in the same shape each provider produced, alongside the original query', async () => {
    mockedDocumentSearch.mockResolvedValue({
      type: 'DOCUMENT',
      providerName: 'DocumentSearchProvider',
      items: [{ id: 'd1', title: 'Doc', snippet: 'snippet', score: 0.9, href: '/documents/d1' }],
    });

    const result = await runSearch(TENANT_ID, 'contract', { types: ['DOCUMENT'] });
    expect(result.query).toBe('contract');
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].items[0].id).toBe('d1');
  });

  test('one provider throwing degrades to an empty group for that type, without failing the whole search', async () => {
    mockedMatterSearch.mockRejectedValue(new Error('simulated Matter provider outage'));
    mockedDocumentSearch.mockResolvedValue({
      type: 'DOCUMENT',
      providerName: 'DocumentSearchProvider',
      items: [{ id: 'd1', title: 'Doc', snippet: 's', score: 1, href: '/documents/d1' }],
    });

    const result = await runSearch(TENANT_ID, 'contract');

    const matterGroup = result.groups.find((g) => g.type === 'MATTER');
    expect(matterGroup).toEqual({ type: 'MATTER', providerName: 'MATTER', items: [] });

    // Every other provider's real result is unaffected by the Matter provider's failure.
    const documentGroup = result.groups.find((g) => g.type === 'DOCUMENT');
    expect(documentGroup?.items).toHaveLength(1);
  });

  test('all providers run in parallel, not sequentially', async () => {
    const order: string[] = [];
    mockedDocumentSearch.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push('DOCUMENT');
      return emptyGroup('DOCUMENT');
    });
    mockedMatterSearch.mockImplementation(async () => {
      order.push('MATTER');
      return emptyGroup('MATTER');
    });

    await runSearch(TENANT_ID, 'contract', { types: ['DOCUMENT', 'MATTER'] });

    // If calls were sequential, DOCUMENT (with its 20ms delay) would
    // necessarily be pushed before MATTER; parallel dispatch means the
    // faster, synchronous-ish MATTER call resolves first.
    expect(order[0]).toBe('MATTER');
  });
});
