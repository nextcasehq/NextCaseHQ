import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the "Not Available" messaging fix: a visitor
 * with no session, under Product Review Mode, used to see a bare
 * "Not Available" heading and "Function available after production
 * activation." with no indication of what was unavailable or why. Every
 * such gate now goes through the shared AuthOrReviewGate /
 * ReviewModeActionNotice components (components/ReviewModeNotice.tsx),
 * which always names the specific feature and explains the review-mode
 * condition. No React component-rendering test infrastructure exists in
 * this repo (see public-login-removal.test.ts) — this asserts at the
 * source-file level, same precedent, so a future page can't silently
 * reintroduce the generic copy either directly or via a new duplicate.
 */

const SRC_ROOT = path.join(__dirname, '..');
const APP_ROOT = path.join(SRC_ROOT, 'app');

const BANNED_STRINGS = [
  'Function available after production activation.',
];
// The bare heading — deliberately excludes "Preview Not Available" (used by
// search/demo/[id]/page.tsx for an unrelated, already-descriptive condition:
// a specific demo search result no longer existing).
const BANNED_HEADING_PATTERN = />Not Available</;

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(full, out);
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('No generic "Not Available" messaging anywhere under app/', () => {
  const files = walkSourceFiles(APP_ROOT);

  test('no page hardcodes the bare ">Not Available<" heading', () => {
    const offenders = files.filter((f) => BANNED_HEADING_PATTERN.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  test.each(BANNED_STRINGS)('no page hardcodes the banned phrase %j', (banned) => {
    const offenders = files.filter((f) => fs.readFileSync(f, 'utf8').includes(banned));
    expect(offenders).toEqual([]);
  });
});

describe('Known auth/review-mode gates use the shared, explanatory components', () => {
  test.each([
    'app/cases/page.tsx',
    'app/cases/[id]/page.tsx',
    'app/matters/page.tsx',
    'app/matters/[id]/page.tsx',
    'app/documents/new/page.tsx',
    'app/documents/[id]/page.tsx',
    'app/search/page.tsx',
  ])('%s renders AuthOrReviewGate instead of an inline auth wall', (relativePath) => {
    const source = readSource(relativePath);
    expect(source).toContain("from '@/components/ReviewModeNotice'");
    expect(source).toMatch(/<AuthOrReviewGate\b/);
  });

  test.each([
    'app/matters/page.tsx',
    'app/matters/[id]/page.tsx',
    'app/documents/new/page.tsx',
    'app/documents/[id]/page.tsx',
  ])('%s renders ReviewModeActionNotice instead of an inline write-guard banner', (relativePath) => {
    const source = readSource(relativePath);
    expect(source).toMatch(/<ReviewModeActionNotice\b/);
  });
});

describe('ReviewModeNotice component copy', () => {
  const source = readSource('components/ReviewModeNotice.tsx');

  test('does not contain the banned generic phrases itself', () => {
    for (const banned of BANNED_STRINGS) {
      expect(source).not.toContain(banned);
    }
    expect(source).not.toMatch(BANNED_HEADING_PATTERN);
  });

  test('AuthOrReviewGate names the specific feature via the `what` prop, not a generic label', () => {
    expect(source).toMatch(/Preview Mode/);
    expect(source).toMatch(/\$\{what\}/);
  });

  test('ReviewModeActionNotice names the specific blocked action via the `action` prop', () => {
    expect(source).toMatch(/\$\{action\}/);
  });
});
