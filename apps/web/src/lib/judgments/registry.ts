import type { JudgmentProvider } from './providers/types';
import { PlaceholderJudgmentProvider } from './providers/placeholder-provider';
import { resolveConfiguredProviderId, getDefaultProviderId } from './config';
import { logJudgmentResearchEvent } from './logging';

/**
 * Every registered JudgmentProvider, keyed by id. Only 'placeholder' is
 * registered today — by design, per the current product decision to keep
 * zero dependency on any external judgment source.
 *
 * To connect a real provider later:
 *   1. Implement JudgmentProvider in providers/some-real-provider.ts.
 *   2. Add one line here: JUDGMENT_PROVIDERS['some-real-provider'] = new
 *      SomeRealProvider(apiKeyFromEnv).
 *   3. Set JUDGMENT_PROVIDER=some-real-provider and enable the
 *      judgment_research feature flag.
 * No other file changes.
 */
const JUDGMENT_PROVIDERS: Record<string, JudgmentProvider> = {
  placeholder: new PlaceholderJudgmentProvider(),
};

/**
 * Resolves the configured provider, falling back to the placeholder
 * provider if the configured id isn't registered — a missing/misspelled
 * JUDGMENT_PROVIDER value degrades to "feature not available" rather
 * than crashing the app.
 */
export function getJudgmentProvider(providerId?: string): JudgmentProvider {
  const id = providerId ?? resolveConfiguredProviderId();
  const provider = JUDGMENT_PROVIDERS[id];
  if (provider) return provider;

  logJudgmentResearchEvent('configured provider not registered — falling back to placeholder', {
    requestedProviderId: id,
  });
  return JUDGMENT_PROVIDERS[getDefaultProviderId()];
}

export function getRegisteredProviderIds(): string[] {
  return Object.keys(JUDGMENT_PROVIDERS);
}

/** Test-only: register or override a provider without touching the
 * module-level registry permanently across test files. */
export function __registerProviderForTests(id: string, provider: JudgmentProvider): void {
  JUDGMENT_PROVIDERS[id] = provider;
}

export function __unregisterProviderForTests(id: string): void {
  delete JUDGMENT_PROVIDERS[id];
}
