import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the public /login removal (Product Owner
 * cleanup milestone). No React component-rendering test infrastructure
 * exists in this repo (no @testing-library/react, no .test.tsx
 * precedent) — installing one is out of scope for a narrow cleanup, so
 * this asserts at the source-file level instead: the removed page no
 * longer exists on disk, and no public-facing surface still links to it.
 * A second block proves the opposite for backend auth infrastructure,
 * which this milestone was required to preserve untouched.
 */

const SRC_ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('Public /login removal', () => {
  test('the /login page no longer exists on disk', () => {
    expect(fs.existsSync(path.join(SRC_ROOT, 'app/login/page.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(SRC_ROOT, 'app/login'))).toBe(false);
  });

  test('desktop and mobile navigation no longer link to /login', () => {
    expect(readSource('components/Navbar.tsx')).not.toContain('/login');
  });

  test('the landing page no longer links to /login', () => {
    expect(readSource('components/landing/sections/HeroSection.tsx')).not.toContain('/login');
    expect(readSource('components/landing/sections/CtaBand.tsx')).not.toContain('/login');
  });

  test.each([
    'app/features/page.tsx',
    'app/pricing/page.tsx',
    'app/solutions/page.tsx',
    'app/contact/page.tsx',
    'app/about/page.tsx',
  ])('public marketing page %s no longer links to /login', (relativePath) => {
    expect(readSource(relativePath)).not.toContain('/login');
  });
});

describe('Backend authentication infrastructure preserved (not modified by the /login removal)', () => {
  // Superseded by the "PRIORITY CHANGE — MAKE NEXTCASEHQ VIEWABLE BY
  // PRODUCT OWNER" milestone: every remaining /login redirect/link
  // (protected-route proxy, dashboard logout, admin logout) was itself a
  // dead end once the page was removed, so that milestone's requirement
  // #10 ("remove every active user-facing redirect or link to /login")
  // replaced all of them with a safe, existing destination. Authentication
  // itself (session validation, tenant isolation, RLS, mutation
  // protection) is untouched — only the redirect/link target changed.
  test('protected-route proxy (formerly middleware) no longer redirects anywhere to /login', () => {
    const proxySource = fs.readFileSync(path.join(__dirname, '../proxy.ts'), 'utf8');
    expect(proxySource).not.toContain("'/login'");
    expect(proxySource).not.toContain('"/login"');
  });

  test('dashboard and admin logout no longer route to /login', () => {
    expect(readSource('app/dashboard/layout.tsx')).not.toContain('/login');
    expect(readSource('app/admin/layout.tsx')).not.toContain('/login');
  });

  test('session, admin-session, and logout API routes are untouched by this cleanup', () => {
    expect(fs.existsSync(path.join(SRC_ROOT, 'app/api/auth/session/route.ts'))).toBe(true);
    expect(fs.existsSync(path.join(SRC_ROOT, 'app/api/auth/logout/route.ts'))).toBe(true);
    expect(fs.existsSync(path.join(SRC_ROOT, 'app/api/admin/session/route.ts'))).toBe(true);
    expect(fs.existsSync(path.join(SRC_ROOT, 'app/api/admin/logout/route.ts'))).toBe(true);
  });
});
