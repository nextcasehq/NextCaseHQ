import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the landing page's "eCourts Connection" panel.
 * No React component-rendering test infrastructure exists in this repo
 * (no @testing-library/react), so this asserts at the source-file level —
 * the same established convention as public-login-removal.test.ts and the
 * document-creator-*.test.ts files.
 */

const SRC_ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('Landing page — eCourts Connection panel', () => {
  const panel = readSource('components/landing/sections/ECourtsConnection.tsx');
  const landingPage = readSource('components/landing/LandingPageContent.tsx');

  test('the panel is wired into the landing page, between Features and Security', () => {
    expect(landingPage).toContain("import ECourtsConnection from \"@/components/landing/sections/ECourtsConnection\"");
    const featuresIndex = landingPage.indexOf('<Features />');
    const panelIndex = landingPage.indexOf('<ECourtsConnection />');
    const securityIndex = landingPage.indexOf('<Security />');
    expect(featuresIndex).toBeGreaterThan(-1);
    expect(panelIndex).toBeGreaterThan(featuresIndex);
    expect(securityIndex).toBeGreaterThan(panelIndex);
  });

  test('no Username/Password login fields exist — this is not a credential form', () => {
    // The prose legitimately says "we never ask for your username or
    // password" — that phrase must survive. What must never exist is an
    // actual input field for either.
    expect(panel).not.toContain('<input');
    expect(panel).not.toContain('<form');
    expect(panel).not.toMatch(/type=["']password["']/);
  });

  test('the panel explicitly states no credentials are collected, stored, or transmitted', () => {
    expect(panel).toMatch(/never (asks for|ask for)[^.]*(username|password)/i);
    expect(panel).toContain('No credentials, ever');
  });

  test('the panel explicitly states no scraping or undocumented APIs are used', () => {
    expect(panel).toMatch(/No scraping, no undocumented APIs/i);
    expect(panel).toMatch(/never scrapes results, bypasses CAPTCHA, or calls undocumented endpoints/i);
  });

  test('the panel describes the real, supported workflow — manual, advocate-confirmed verification', () => {
    expect(panel).toMatch(/Manual, advocate-confirmed verification/i);
    expect(panel).toContain('Manual verification');
  });

  test('the call-to-action launches the dedicated explainer page, not the dashboard directly', () => {
    // A direct drop into /dashboard/matters skipped explaining the workflow
    // first. /ecourts-verification (app/ecourts-verification/page.tsx) gives
    // context, then hands off to the same real, already-shipped
    // "Check eCourts Case Update" flow.
    expect(panel).toMatch(/href="\/ecourts-verification"/);
    expect(panel).toContain('Start eCourts Verification');
  });

  test('never implies the user is logging into eCourts itself', () => {
    // The heading legitimately says NextCaseHQ never *holds* the
    // advocate's eCourts login (i.e. credential) — that's the opposite of
    // implying NextCaseHQ authenticates the user against eCourts. What
    // must never appear is copy phrasing this as an action performed
    // through NextCaseHQ, e.g. a CTA reading "Log in to eCourts".
    expect(panel).not.toMatch(/log\s*in to eCourts/i);
    expect(panel).not.toMatch(/sign in to eCourts/i);
    expect(panel).not.toContain('eCourts Login');
  });
});
