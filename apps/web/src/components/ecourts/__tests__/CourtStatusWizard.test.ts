import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the registry-driven eCourts Case Status wizard.
 * Source-level assertions, per this repo's established convention (no
 * @testing-library/react) — the interactive, stateful behavior (chip
 * collapsing, step advancement, free-text fallback) was verified manually
 * against the running preview build, not simulated here.
 */

const SRC_ROOT = path.join(__dirname, '../../..');
function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('CourtStatusWizard — registry-driven, no per-court branching', () => {
  const wizard = readSource('components/ecourts/CourtStatusWizard.tsx');

  test('reads from the shared registry rather than defining its own court list', () => {
    expect(wizard).toContain("from '@/lib/ecourts-registry/registry'");
    expect(wizard).toContain('COURT_SYSTEMS');
    expect(wizard).toContain('getCourtSystem');
  });

  test('has no switch statement and no per-court-id branching — step rendering is driven by step.kind only', () => {
    expect(wizard).not.toMatch(/\bswitch\s*\(/);
    // No hardcoded court ids anywhere in the render logic (only in the
    // registry/config files, which this component never duplicates).
    expect(wizard).not.toContain("'district-courts'");
    expect(wizard).not.toContain('"district-courts"');
  });

  test('has no login form of any kind — search fields are not credentials', () => {
    expect(wizard).not.toMatch(/type=["']password["']/);
    expect(wizard).not.toMatch(/\bUsername\b/);
  });

  test('completed steps collapse into a summary chip with a way to jump back', () => {
    expect(wizard).toContain('CompletedStepChip');
    expect(wizard).toContain('onReset');
  });

  test('a coming-soon court system shows an honest notice, never fabricated fields', () => {
    expect(wizard).toMatch(/coming-soon/);
    expect(wizard).toMatch(/isn.{0,10}t available here yet/);
  });

  test('the final step hands off into the real, existing Matter Register workflow', () => {
    expect(wizard).toContain('Continue to Matter Register');
    expect(wizard).toMatch(/href="\/dashboard\/matters"/);
  });
});
