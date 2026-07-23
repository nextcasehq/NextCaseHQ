/**
 * Configuration layer — the ONLY place an environment variable is read to
 * decide which judgment provider is active. No other file in this
 * application reads JUDGMENT_PROVIDER or knows a provider's id by name;
 * everything else calls resolveConfiguredProviderId() (this file) and
 * getJudgmentProvider() (../registry.ts).
 *
 * Deliberately generic: this file does not name any specific external
 * vendor. Connecting a real provider later means registering it in
 * ../registry.ts under whatever id you choose, then setting
 * JUDGMENT_PROVIDER to that id — no code here changes.
 */

const DEFAULT_PROVIDER_ID = 'placeholder';

export function resolveConfiguredProviderId(): string {
  const configured = process.env.JUDGMENT_PROVIDER?.trim();
  return configured || DEFAULT_PROVIDER_ID;
}

export function getDefaultProviderId(): string {
  return DEFAULT_PROVIDER_ID;
}
