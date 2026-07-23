import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the Judgment Research architecture milestone —
 * a JudgmentProvider interface, registry, config, entitlement, usage
 * tracking, logging, and a placeholder provider, with ZERO external
 * provider connected. Source-level assertions for the UI-adjacent pieces,
 * per this repo's established convention (no @testing-library/react);
 * the library logic itself (lib/judgments/**) has real unit tests
 * alongside its source, not here.
 */

const SRC_ROOT = path.join(__dirname, '..');
function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('Judgment Research — feature flag registered, disabled by default', () => {
  const flags = readSource('lib/admin/feature-flags.ts');

  test('the judgment_research flag exists and defaults to disabled', () => {
    const flagLineMatch = flags.match(/\{ key: 'judgment_research'.*\}/);
    expect(flagLineMatch).not.toBeNull();
    expect(flagLineMatch![0]).toContain('enabled: false');
  });

  test('the flag is not production-gated — this is architecture, not a live financial/compliance concern yet', () => {
    const flagLineMatch = flags.match(/\{ key: 'judgment_research'.*\}/);
    expect(flagLineMatch![0]).toContain('productionGated: false');
  });
});

describe('Judgment Research — the application behaves exactly as if the feature does not exist yet', () => {
  test('the landing page never references Judgment Research or the new route', () => {
    const landing = readSource('components/landing/LandingPageContent.tsx');
    expect(landing).not.toMatch(/judgment-research/i);
    expect(landing).not.toMatch(/Judgment Research/);
  });

  test('the global Navbar never links to it', () => {
    const navbar = readSource('components/Navbar.tsx');
    expect(navbar).not.toMatch(/judgment-research/i);
  });

  test('the dashboard shell never links to it', () => {
    const dashboardLayout = readSource('app/dashboard/layout.tsx');
    expect(dashboardLayout).not.toMatch(/judgment-research/i);
  });
});

describe('Judgment Research — the demo page never fabricates results', () => {
  const page = readSource('app/dashboard/judgment-research/page.tsx');

  test('renders the provider-reported message rather than any hardcoded/mocked judgment content', () => {
    expect(page).not.toMatch(/mock|fake|dummy|sample judgment/i);
    expect(page).toContain('result.message');
  });

  test('reuses the existing session/auth mechanism — no new auth was built', () => {
    // A real search form is expected and fine — it's not a credential form.
    expect(page).not.toMatch(/type=["']password["']/);
    expect(page).not.toMatch(/\bUsername\b/);
    expect(page).toContain('needsAuth');
  });
});

describe('Judgment Research — the API route reuses existing session auth, not a new mechanism', () => {
  const route = readSource('app/api/judgments/search/route.ts');

  test('requires the same session check every other route uses', () => {
    expect(route).toContain('requireSession');
    expect(route).toContain('UnauthenticatedError');
  });

  test('calls only searchJudgments() — no provider is imported directly', () => {
    expect(route).toContain('searchJudgments');
    expect(route).not.toMatch(/PlaceholderJudgmentProvider|IndianKanoon/i);
  });
});
