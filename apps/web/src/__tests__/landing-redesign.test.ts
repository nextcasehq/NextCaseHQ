import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the Phase 1 landing-page redesign — a
 * product-first, single-screen front door (Universal Search primary,
 * eCourts Case Status secondary, four action cards, minimal footer)
 * replacing the old marketing-style page. Source-level assertions, per
 * this repo's established convention (no @testing-library/react).
 */

const SRC_ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('Landing redesign — single-screen product-first front door', () => {
  const landing = readSource('components/landing/LandingPageContent.tsx');

  test('branding: wordmark, HQ subtitle, and tagline are present', () => {
    expect(landing).toContain('NextCase');
    expect(landing).toContain('HQ');
    expect(landing).toContain('AI-Powered Legal Workspace');
    expect(landing).toContain('<Logo');
  });

  test('Universal Search is the primary action — a real, working search form', () => {
    expect(landing).toContain('Universal Legal Search');
    expect(landing).toContain("router.push(`/search?q=");
    expect(landing).toMatch(/role="search"/);
  });

  test('eCourts Case Status is the secondary action, and represents the real workflow only', () => {
    expect(landing).toContain('eCourts Case Status');
    expect(landing).toMatch(/href="\/ecourts-verification"/);
    // No fake login: no credential fields anywhere on the landing page.
    expect(landing).not.toContain('<input type="password"');
    expect(landing).not.toMatch(/\bUsername\b/);
  });

  test('exactly four equal action cards: Case Diary, Document Creation, Judgment Search, Matter Register', () => {
    for (const title of ['Case Diary', 'Document Creation', 'Judgment Search', 'Matter Register']) {
      expect(landing).toContain(`title: "${title}"`);
    }
    const cardArrayMatch = landing.match(/const ACTION_CARDS: ActionCard\[\] = \[([\s\S]*?)\n\];/);
    expect(cardArrayMatch).not.toBeNull();
    const titleCount = (cardArrayMatch![1].match(/title:/g) ?? []).length;
    expect(titleCount).toBe(4);
  });

  test('every action card and both primary/secondary actions route to real, existing app functionality', () => {
    // Case Diary -> the real /cases chamber; Document Creation -> the real
    // Document Creator; Judgment Search -> the real /search, filtered to
    // documents; Matter Register -> the real (synthetic-data) Matter
    // Register that already ships the eCourts verification workflow.
    expect(landing).toContain('href: "/cases"');
    expect(landing).toContain('href: "/dashboard/draft-builder"');
    expect(landing).toContain('href: "/search?type=document"');
    expect(landing).toContain('href: "/dashboard/matters"');
    const dashboardMatters = readSource('app/dashboard/matters/page.tsx');
    expect(dashboardMatters).toContain('CheckECourtsCaseUpdateModal');
  });

  test('no placeholder functionality and no fake authentication screens', () => {
    expect(landing).not.toMatch(/coming soon/i);
    expect(landing).not.toMatch(/OTP/);
    expect(landing).not.toMatch(/verification code/i);
    // Exactly one <form> should exist — the real Universal Search form.
    expect((landing.match(/<form/g) ?? []).length).toBe(1);
  });

  test('social icons are omitted rather than faked — no unverified social links', () => {
    // No established NextCaseHQ social accounts exist anywhere else in
    // this codebase; inventing plausible-looking handles would itself be
    // placeholder functionality.
    expect(landing).not.toMatch(/twitter\.com|x\.com\/next|linkedin\.com\/company\/next|facebook\.com\/next|instagram\.com\/next/i);
  });

  test('minimal footer: Privacy, Terms, Contact, a real support email, and copyright — nothing else', () => {
    expect(landing).toMatch(/href="\/privacy"/);
    expect(landing).toMatch(/href="\/terms"/);
    expect(landing).toMatch(/href="\/contact"/);
    expect(landing).toContain('mailto:counsel@nextcasehq.com');
    expect(landing).toMatch(/©/);
  });

  test('no marketing sections remain: no features grid, no security/testimonial/pricing/stats blocks', () => {
    expect(landing).not.toMatch(/Capabilities/);
    expect(landing).not.toMatch(/Security architecture/);
    expect(landing).not.toMatch(/testimonial/i);
    expect(landing).not.toMatch(/pricing/i);
    expect(landing).not.toMatch(/256-bit|Zero-Knowledge Envelope/);
  });

  test('the old marketing-only landing components are gone (replaced, not iterated on)', () => {
    for (const removed of [
      'components/landing/Hero.tsx',
      'components/landing/sections/HeroSection.tsx',
      'components/landing/sections/ProductPreview.tsx',
      'components/landing/sections/TrustBar.tsx',
      'components/landing/sections/Features.tsx',
      'components/landing/sections/Security.tsx',
      'components/landing/sections/Workflow.tsx',
      'components/landing/sections/CtaBand.tsx',
      'components/landing/sections/SiteFooter.tsx',
      'components/landing/sections/ECourtsConnection.tsx',
    ]) {
      expect(fs.existsSync(path.join(SRC_ROOT, removed))).toBe(false);
    }
  });
});

describe('Landing redesign — the marketing pages themselves are kept, just unlinked from home', () => {
  for (const marketingPage of [
    'app/features/page.tsx',
    'app/pricing/page.tsx',
    'app/solutions/page.tsx',
    'app/contact/page.tsx',
    'app/about/page.tsx',
  ]) {
    test(`${marketingPage} still exists`, () => {
      expect(fs.existsSync(path.join(SRC_ROOT, marketingPage))).toBe(true);
    });
  }

  test('the new landing page never links to the retired marketing nav destinations', () => {
    const landing = readSource('components/landing/LandingPageContent.tsx');
    for (const retiredHref of ['/features', '/pricing', '/solutions']) {
      expect(landing).not.toContain(`href="${retiredHref}"`);
    }
  });
});

describe('Landing redesign — global Navbar is hidden only on the homepage', () => {
  const wrapper = readSource('components/NavbarWrapper.tsx');

  test('the homepage is added to the hide list', () => {
    expect(wrapper).toMatch(/hideNavbarRoutes\s*=\s*\[[^\]]*['"]\/['"]/);
  });

  test('the hide check is an exact match, not a prefix match, so /features etc. are unaffected', () => {
    expect(wrapper).toContain('hideNavbarRoutes.includes(pathname)');
  });
});
