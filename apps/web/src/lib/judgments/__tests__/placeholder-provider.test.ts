import { PlaceholderJudgmentProvider } from '../providers/placeholder-provider';

describe('PlaceholderJudgmentProvider', () => {
  const provider = new PlaceholderJudgmentProvider();

  test('identifies itself honestly as a placeholder', () => {
    expect(provider.id).toBe('placeholder');
    expect(provider.isPlaceholder).toBe(true);
    expect(provider.requiresAttribution).toBe(false);
  });

  test('never returns a fabricated document — status is always "unavailable" with an empty list', async () => {
    const result = await provider.search({ query: 'ABC vs State of Kerala', tenantId: 't1', userId: 'u1' });
    expect(result.status).toBe('unavailable');
    expect(result.documents).toEqual([]);
    expect(result.provider).toBe('placeholder');
  });

  test('always returns a human-readable message explaining the feature is not available', async () => {
    const result = await provider.search({ query: 'anything', tenantId: 't1', userId: 'u1' });
    expect(result.message).toBeTruthy();
    expect(result.message).toMatch(/being enhanced|not available|no external judgment source/i);
  });

  test('echoes back the real query it was given, never a canned/example query', async () => {
    const result = await provider.search({ query: 'Matter 42/2025', tenantId: 't1', userId: 'u1' });
    expect(result.query).toBe('Matter 42/2025');
  });
});
