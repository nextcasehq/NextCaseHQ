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

describe('CourtStatusWizard — geography-first, registry-driven, no per-court branching', () => {
  const wizard = readSource('components/ecourts/CourtStatusWizard.tsx');

  test('reads from the shared District Courts config rather than defining its own steps', () => {
    expect(wizard).toContain("from '@/lib/ecourts-registry/configs/district-courts'");
    expect(wizard).toContain('districtCourtsConfig');
  });

  test('District Courts remains the default flow, with a switcher now that other systems are available', () => {
    // More than one court system is `status: 'available'` in the registry
    // today (District Courts, High Courts, Supreme Court, Consumer
    // Commissions), so a switcher is now warranted — this replaces the
    // earlier assertion that no such picker existed, from when District
    // Courts was the only available system.
    expect(wizard).toContain('AVAILABLE_COURT_SYSTEMS');
    expect(wizard).toContain("districtCourtsConfig.id");
  });

  test('has no switch statement — step rendering is driven by step.kind only', () => {
    expect(wizard).not.toMatch(/\bswitch\s*\(/);
  });

  test('has no login form of any kind — search fields are not credentials', () => {
    expect(wizard).not.toMatch(/type=["']password["']/);
    expect(wizard).not.toMatch(/\bUsername\b/);
  });

  test('completed steps collapse into a summary chip with a way to jump back', () => {
    expect(wizard).toContain('CompletedStepChip');
    expect(wizard).toContain('onReset');
  });

  test('a Court Establishment chip can display its real court type without it affecting the Search Method step', () => {
    expect(wizard).toContain('courtType');
    // The metadata is display-only — Search Method still renders every
    // registered method regardless of which establishment was chosen.
    expect(wizard).not.toMatch(/courtType[^;]*(filter|includes)\(/);
  });

  test('the final step hands off into the real, existing Matter Register workflow', () => {
    expect(wizard).toContain('Continue to Matter Register');
    expect(wizard).toMatch(/href="\/dashboard\/matters"/);
  });
});
