import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the /ecourts-verification explainer page — the
 * intermediate stop between the landing page's "eCourts Case Status"
 * secondary action and the real Matter Register verification workflow.
 * Source-level assertions, per this repo's established convention (no
 * @testing-library/react).
 */

const SRC_ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('/ecourts-verification explainer page', () => {
  const page = readSource('app/ecourts-verification/page.tsx');

  test('exists as a real route', () => {
    expect(fs.existsSync(path.join(SRC_ROOT, 'app/ecourts-verification/page.tsx'))).toBe(true);
  });

  test('has no login form of any kind', () => {
    expect(page).not.toContain('<input');
    expect(page).not.toContain('<form');
    expect(page).not.toMatch(/type=["']password["']/);
  });

  test('explains the workflow in steps: search, open on eCourts, confirm', () => {
    expect(page).toContain('Search');
    expect(page).toContain('Open on eCourts');
    expect(page).toContain('Confirm');
    expect(page).toMatch(/How it works/i);
  });

  test('describes what information is needed', () => {
    expect(page).toMatch(/What you.{0,10}ll need/i);
    expect(page).toMatch(/CNR number/i);
    expect(page).toMatch(/[Cc]ase number/);
  });

  test('states plainly that no eCourts credentials are ever collected', () => {
    expect(page).toMatch(/never asks for[^.]*(username|password)/i);
  });

  test('has exactly one call-to-action, which hands off into the real Matter Register workflow', () => {
    const ctaMatches = page.match(/Start Verification/g) ?? [];
    expect(ctaMatches.length).toBe(1);
    expect(page).toMatch(/href="\/dashboard\/matters"/);
    const dashboardMattersUsesECourtsFlow = readSource('app/dashboard/matters/page.tsx');
    expect(dashboardMattersUsesECourtsFlow).toContain('CheckECourtsCaseUpdateModal');
  });

  test('never implies logging into eCourts itself', () => {
    expect(page).not.toMatch(/log\s*in to eCourts/i);
    expect(page).not.toMatch(/sign in to eCourts/i);
    expect(page).not.toContain('eCourts Login');
  });

  test('renders the shared Footer, and lets the global Navbar show (no navbar-hiding route prefix)', () => {
    expect(page).toContain('<Footer');
    expect(page).not.toContain("'use client'");
  });
});

describe('Landing page secondary action hands off into the explainer page, not straight into the dashboard', () => {
  const landing = readSource('components/landing/LandingPageContent.tsx');

  test('the "eCourts Case Status" secondary action links to /ecourts-verification', () => {
    expect(landing).toMatch(/href="\/ecourts-verification"/);
    expect(landing).toContain('eCourts Case Status');
  });
});
