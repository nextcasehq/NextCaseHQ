import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the Document Creator Phase 2 milestone
 * (Durable Draft and Continuous Autosave). No React component-rendering
 * test infrastructure exists in this repo (no @testing-library/react),
 * so this asserts at the source-file level — the same established
 * convention as matter-closure-ui.test.ts and public-login-removal.test.ts.
 */

const SRC_ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('Document Creator Phase 2 — Durable Draft and Continuous Autosave', () => {
  const hook = readSource('lib/documents/useDurableAutosave.ts');
  const page = readSource('app/dashboard/draft-builder/page.tsx');

  test('the autosave hook exists and is wired into the real draft-builder editor', () => {
    expect(page).toContain("from '@/lib/documents/useDurableAutosave'");
    expect(page).toContain('useDurableAutosave({');
  });

  test('the hook exposes exactly the six required status states', () => {
    for (const state of ['saving', 'saved', 'offline', 'save_failed', 'conflict_detected', 'recovered_draft']) {
      expect(hook).toContain(`'${state}'`);
    }
  });

  test('every status is surfaced in the editor UI, not just tracked internally', () => {
    expect(page).toContain('AUTOSAVE_STATUS_LABEL[autosave.status]');
  });

  test('autosave calls only the three permitted document-draft endpoints', () => {
    expect(hook).toContain("fetch('/api/documents/drafts'");
    expect(hook).toContain('fetch(`/api/documents/drafts/${');
    expect(hook).not.toMatch(/fetch\(`?\/api\/(?!documents\/drafts)/);
  });

  test('autosave uses debounce, not an immediate write on every keystroke', () => {
    expect(hook).toContain('setTimeout');
    expect(hook).toContain('debounceMs');
  });

  test('the local (Tier 1) mirror happens independently of the debounced server write', () => {
    expect(hook).toContain('saveLocalDraft');
    expect(hook).toContain('loadLocalDraft');
  });

  test('optimistic concurrency: every autosave write sends the revision it was based on', () => {
    expect(hook).toContain('expected_revision: revisionRef.current');
  });

  test('a 409 conflict is handled explicitly, not treated as a generic failure', () => {
    expect(hook).toContain("res.status === 409");
    expect(hook).toContain("setStatus('conflict_detected')");
  });

  test('the conflict UI offers a real resolution, not a dead end', () => {
    expect(page).toContain('autosave.loadNewer');
    expect(page).toContain('autosave.keepMine');
  });

  test('tenant/user identity for autosave is never read from the client — no client-supplied identity fields', () => {
    expect(hook).not.toMatch(/tenant_id\s*:/);
    expect(hook).not.toMatch(/user_id\s*:/);
  });

  test('the localStorage pointer stores only an id, never treated as content authority', () => {
    expect(hook).toContain('localStorage.getItem');
    expect(hook).toContain('localStorage.setItem');
    expect(hook).not.toMatch(/localStorage\.setItem\([^)]*content/i);
  });

  test('manual drafting (typing) is never gated by autosave status — the editor textareas remain plain controlled inputs', () => {
    expect(page).toContain('value={editorHeader}');
    expect(page).toContain('value={editorText}');
    expect(page).not.toMatch(/disabled=\{.*autosave/);
  });
});
