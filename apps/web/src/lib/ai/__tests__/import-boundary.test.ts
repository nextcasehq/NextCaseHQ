import fs from 'fs';
import path from 'path';

/**
 * Milestone 2, Decision 5: AI modules obtain business context only through
 * approved interfaces (the AI Context Gateway) — no direct database access
 * from AI prompt builders. This repo has no real ESLint configuration
 * (`pnpm lint` is a no-op echo), so a notional `no-restricted-imports` rule
 * would never actually run. This test enforces the boundary for real, in
 * CI, by inspecting source text for forbidden direct-DB imports.
 *
 * Modules NOT listed here (the AI Context Gateway itself, usage-metering,
 * and the context/sources/* fetchers) are the approved interfaces this
 * boundary protects — they are expected to import the database client, and
 * are deliberately excluded from this check.
 */
const AI_DIR = path.resolve(__dirname, '..');

const FORBIDDEN_IMPORT_PATTERNS = [/['"]@\/lib\/db\/db-client['"]/, /['"]pg['"]/];

const BOUNDARY_ENFORCED_FILES = [
  'prompt-builder.ts',
  'llm-provider.ts',
  'rag.ts',
  'entitlement.ts',
  'errors.ts',
  'retry.ts',
  'types.ts',
  path.join('providers', 'openai-provider.ts'),
  path.join('providers', 'anthropic-provider.ts'),
];

describe('AI import boundary', () => {
  test.each(BOUNDARY_ENFORCED_FILES)('%s does not import the database client directly', (relativePath) => {
    const fullPath = path.join(AI_DIR, relativePath);
    const source = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      expect(source).not.toMatch(pattern);
    }
  });

  test('the enforced file list stays in sync with what actually exists under lib/ai', () => {
    for (const relativePath of BOUNDARY_ENFORCED_FILES) {
      expect(fs.existsSync(path.join(AI_DIR, relativePath))).toBe(true);
    }
  });
});
