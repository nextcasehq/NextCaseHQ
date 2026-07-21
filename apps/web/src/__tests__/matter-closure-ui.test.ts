import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the Matter Closure and Reopening UI milestone.
 * No React component-rendering test infrastructure exists in this repo
 * (no @testing-library/react, no .test.tsx precedent), so this asserts
 * at the source-file level: the new panel exists, is wired into the real
 * /matters/[id] page (not the mock dashboard register), calls only the
 * three permitted closure APIs, respects the is_demo guard convention,
 * and requires the exact advocate confirmation statement server enforces.
 */

const SRC_ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('Matter Closure and Reopening UI', () => {
  const panel = readSource('app/matters/[id]/MatterClosurePanel.tsx');
  const page = readSource('app/matters/[id]/page.tsx');

  test('the closure panel component exists on disk', () => {
    expect(fs.existsSync(path.join(SRC_ROOT, 'app/matters/[id]/MatterClosurePanel.tsx'))).toBe(true);
  });

  test('the real Matter detail page imports and renders the closure panel', () => {
    expect(page).toContain("import MatterClosurePanel from './MatterClosurePanel'");
    expect(page).toContain('<MatterClosurePanel');
    expect(page).toContain('matterId={id}');
    expect(page).toContain('status={matter.status}');
    expect(page).toContain('isDemo={!!matter.is_demo}');
  });

  test('the panel calls only the three permitted closure/reopening APIs', () => {
    expect(panel).toContain('/api/matters/${matterId}/close');
    expect(panel).toContain('/api/matters/${matterId}/reopen');
    expect(panel).toContain('/api/matters/${matterId}/audit');
    expect(panel).not.toMatch(/fetch\(`\/api\/matters\/\$\{matterId\}\/(?!close|reopen|audit)/);
  });

  test('close and reopen submissions respect the is_demo / Product Review Mode guard', () => {
    expect(panel).toContain('if (isDemo) {');
    expect(panel).toContain('onShowUnavailablePrompt();');
  });

  test('the exact advocate confirmation statement is imported from the shared domain module, not hardcoded', () => {
    expect(panel).toContain('MATTER_CLOSURE_CONFIRMATION_STATEMENT');
    expect(panel).toContain("from '@/lib/domain/matter-closure'");
  });

  test('the close submit button is disabled until the confirmation statement matches exactly', () => {
    expect(panel).toContain('closeForm.confirmation_typed !== MATTER_CLOSURE_CONFIRMATION_STATEMENT');
  });

  test('a closed-matter read-only banner is rendered distinctly from the active close-action UI', () => {
    expect(panel).toContain('read-only');
    expect(panel).toContain("isClosed = status === 'CLOSED'");
  });

  test('reopening requires selecting an authorised reopening reason', () => {
    expect(panel).toContain('MATTER_REOPENING_REASONS');
    expect(panel).toContain('reopening_reason: reopeningReason');
  });
});
