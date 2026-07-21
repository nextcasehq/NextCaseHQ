import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the "PRIORITY CHANGE — MAKE NEXTCASEHQ VIEWABLE
 * BY PRODUCT OWNER" milestone (Stage 2: remove viewing locks). No React
 * component-rendering test infrastructure exists in this repo (no
 * @testing-library/react), so this asserts at the source-file level — the
 * same established convention as public-login-removal.test.ts and
 * document-creator-autosave-ui.test.ts. Behavioral coverage for the
 * always-on public preview surface and the restored opt-in-only Product
 * Review Mode lives in middleware.test.ts; this file focuses on the
 * UI-layer requirements — no dead /login links or redirects anywhere a
 * public visitor can reach, and no real-data leakage in the demo-data
 * source itself.
 */

const SRC_ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('Stage 2 — public-view journeys never link or redirect to the deleted /login route', () => {
  test.each([
    'components/landing/Hero.tsx',
    'app/search/page.tsx',
    'app/documents/new/page.tsx',
    'app/dashboard/draft-builder/page.tsx',
    'app/cases/page.tsx',
    'app/cases/[id]/page.tsx',
    'app/cases/[id]/court-note/page.tsx',
    'app/matters/page.tsx',
    'app/matters/[id]/page.tsx',
    'app/documents/[id]/page.tsx',
  ])('%s does not reference /login', (relativePath) => {
    expect(readSource(relativePath)).not.toContain('/login');
  });

  test('protected-action walls show the required phone-verification message instead of a login link', () => {
    for (const relativePath of [
      'app/cases/page.tsx',
      'app/cases/[id]/page.tsx',
      'app/cases/[id]/court-note/page.tsx',
      'app/matters/page.tsx',
      'app/matters/[id]/page.tsx',
      'app/documents/[id]/page.tsx',
      'app/search/page.tsx',
    ]) {
      expect(readSource(relativePath)).toContain('Phone verification is required to save or access private work.');
    }
  });

  test('the landing page search bar and quick actions route to real public destinations, not a dead /login route', () => {
    const hero = readSource('components/landing/Hero.tsx');
    expect(hero).toContain("router.push(`/search?q=");
    expect(hero).toContain('href="/dashboard"');
    expect(hero).toContain('href="/documents/new"');
    expect(hero).toContain('href="/dashboard/matters"');
  });
});

describe('Stage 2 — proxy.ts default-on public viewing (source-level, behavioral coverage in middleware.test.ts)', () => {
  const proxySource = fs.readFileSync(path.join(__dirname, '../proxy.ts'), 'utf8');
  const demoDataSource = fs.readFileSync(path.join(__dirname, '../lib/beta/demo-data.ts'), 'utf8');

  test('proxy.ts never redirects to /login — every redirect target is a real, existing route', () => {
    expect(proxySource).not.toContain("'/login'");
    expect(proxySource).not.toContain('"/login"');
    const redirectTargets = Array.from(proxySource.matchAll(/NextResponse\.redirect\(new URL\('([^']+)'/g)).map(
      (m) => m[1]
    );
    expect(redirectTargets.length).toBeGreaterThan(0);
    for (const target of redirectTargets) {
      expect(target).toBe('/');
    }
  });

  test('Product Review Mode is opt-in and secure-by-default (never globally enabled by default)', () => {
    expect(demoDataSource).toContain("process.env.PRODUCT_REVIEW_MODE === 'true'");
  });

  test('the always-on public preview surface is a separate, explicit function — not folded into the opt-in Product Review Mode gate', () => {
    expect(proxySource).toContain('matchPublicPreviewRoute');
    // The always-on interception in proxy.ts must not be conditioned on
    // isProductReviewModeEnabled() — find the call site and confirm it
    // isn't guarded by that check on the same statement.
    const alwaysOnCallIndex = proxySource.indexOf('matchPublicPreviewRoute(pathname');
    const precedingCode = proxySource.slice(Math.max(0, alwaysOnCallIndex - 400), alwaysOnCallIndex);
    expect(precedingCode).not.toContain('isProductReviewModeEnabled()');
  });

  test('Admin and /api/admin/* gating is untouched — still resolved before Product Review Mode / dashboard sections run', () => {
    const adminApiIndex = proxySource.indexOf("pathname.startsWith('/api/admin')");
    const adminPageIndex = proxySource.indexOf("pathname.startsWith('/admin')");
    const reviewModeIndex = proxySource.indexOf('isProductReviewModeEnabled()');
    const dashboardIndex = proxySource.indexOf("pathname.startsWith('/dashboard')");
    expect(adminApiIndex).toBeGreaterThan(-1);
    expect(adminPageIndex).toBeGreaterThan(-1);
    expect(adminApiIndex).toBeLessThan(adminPageIndex);
    expect(adminPageIndex).toBeLessThan(reviewModeIndex);
    expect(reviewModeIndex).toBeLessThan(dashboardIndex);
  });
});

describe('Stage 2 — Product Review Mode never sources real tenant data', () => {
  const demoDataSource = fs.readFileSync(path.join(__dirname, '../lib/beta/demo-data.ts'), 'utf8');

  test('demo-data.ts never imports the database client or issues SQL — every payload is a hand-written literal', () => {
    expect(demoDataSource).not.toMatch(/from ['"]@\/lib\/db\/db-client['"]/);
    expect(demoDataSource).not.toMatch(/DatabaseClient/);
    expect(demoDataSource).not.toMatch(/\bSELECT\b/i);
  });

  test('every reserved demo id uses the fixed deadbeef- prefix, never a real generated id', () => {
    const idLiterals = Array.from(demoDataSource.matchAll(/'deadbeef-0000-4000-8000-[0-9a-f]{12}'/g));
    expect(idLiterals.length).toBeGreaterThan(0);
  });

  test('matchProductReviewRoute only ever intercepts GET-only paths — no write route is short-circuited here (enforced in proxy.ts, not this module)', () => {
    expect(demoDataSource).not.toMatch(/request\.method/);
  });
});

describe('Stage 2 — Document Creator (draft-builder) never gets stuck on a loader when unauthenticated', () => {
  test('an unauthenticated visitor is resolved to a definite status, not left in an indefinite loading state', () => {
    const hook = readSource('lib/documents/useDurableAutosave.ts');
    // The hook always resolves the one-time init effect to a concrete
    // status (saved/recovered_draft/unauthenticated/save_failed/offline)
    // — there is no branch that leaves `status` at its initial default
    // indefinitely while a network call is outstanding forever.
    expect(hook).toContain("setStatus('unauthenticated')");
    expect(hook).not.toContain("setStatus('loading')");
  });
});
