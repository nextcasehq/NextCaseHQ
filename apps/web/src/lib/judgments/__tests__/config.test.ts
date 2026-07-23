import { resolveConfiguredProviderId, getDefaultProviderId } from '../config';

describe('Judgment Research configuration', () => {
  const originalEnv = process.env.JUDGMENT_PROVIDER;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.JUDGMENT_PROVIDER;
    else process.env.JUDGMENT_PROVIDER = originalEnv;
  });

  test('defaults to the placeholder provider when JUDGMENT_PROVIDER is unset', () => {
    delete process.env.JUDGMENT_PROVIDER;
    expect(resolveConfiguredProviderId()).toBe(getDefaultProviderId());
    expect(getDefaultProviderId()).toBe('placeholder');
  });

  test('reads whatever provider id is configured — this file never hardcodes a real vendor name', () => {
    process.env.JUDGMENT_PROVIDER = 'some-future-provider';
    expect(resolveConfiguredProviderId()).toBe('some-future-provider');
  });

  test('an empty/whitespace-only value falls back to the default rather than an invalid empty id', () => {
    process.env.JUDGMENT_PROVIDER = '   ';
    expect(resolveConfiguredProviderId()).toBe(getDefaultProviderId());
  });
});
