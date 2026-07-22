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

  test('the hook exposes exactly the seven required status states', () => {
    for (const state of [
      'saving',
      'saved',
      'offline',
      'save_failed',
      'conflict_detected',
      'recovered_draft',
      'unauthenticated',
    ]) {
      expect(hook).toContain(`'${state}'`);
    }
  });

  test('an unauthenticated visitor never loses their typed work — the draft is preserved locally, never blocked on a server draft id', () => {
    expect(hook).toContain('isLocalOnlyRef');
    expect(hook).toContain("res.status === 401");
    expect(hook).toContain('crypto.randomUUID()');
  });

  test('a brand-new local-only draft (unauthenticated create) is written to IndexedDB immediately, not only on the next keystroke', () => {
    // Regression: syncedRef is set to the initial content right away so
    // the content-effect (which only re-saves on *divergence* from
    // syncedRef) never fires for it — meaning if createDraft's 401
    // branch didn't ALSO call saveLocalDraft directly, the very first
    // template/blank draft a visitor sees would silently vanish on
    // refresh unless they typed at least one further edit first.
    const createDraftStart = hook.indexOf('const createDraft');
    const createDraftBody = hook.slice(createDraftStart, createDraftStart + 2000);
    const unauthenticatedBranchStart = createDraftBody.indexOf('res.status === 401');
    const unauthenticatedBranch = createDraftBody.slice(unauthenticatedBranchStart, unauthenticatedBranchStart + 1200);
    expect(unauthenticatedBranch).toContain('saveLocalDraft');
  });

  test('the unauthenticated status is surfaced with the required exact wording', () => {
    expect(page).toContain('Local draft — phone verification required for permanent saving.');
  });

  test('the hook exposes startNewDraft for template selection\'s "always an independent draft" requirement', () => {
    expect(hook).toContain('startNewDraft');
    // startNewDraft must actually go through the same create-draft path
    // (and therefore the same POST /api/documents/drafts endpoint,
    // 401-safe local-only fallback, and localStorage pointer handling) as
    // the hook's own one-time initialization — not a second, divergent
    // implementation.
    expect(hook).toContain('createDraft');
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

  test('manual drafting (typing) is never gated by autosave status — the rich-text editor is always editable regardless of save state', () => {
    expect(page).toContain('editable: true');
    expect(page).not.toMatch(/editable:\s*.*autosave/);
  });

  test('the rebuilt editor uses a real structured rich-text engine, not a plain textarea or raw contentEditable', () => {
    const editorHookSource = readSource('components/document-editor/useDocumentEditor.ts');
    expect(editorHookSource).toContain('@tiptap/react');
    expect(editorHookSource).toContain('@tiptap/starter-kit');
    expect(page).not.toMatch(/<textarea/);
    expect(page).not.toContain('document.execCommand');
  });

  test('resuming an existing draft guards the content-effect until recovery has actually landed', () => {
    // Regression: both resume branches (401 and 200-OK) call setDraftId
    // before their own async loadLocalDraft/onRecovered work finishes.
    // Without recoveringRef, the content-effect's "has anything changed"
    // check runs against this render's fresh-mount defaults (title is
    // never actually null, only content is '' at that point) and
    // schedules a save of that empty content at the real, already-current
    // revision — silently overwriting a previously-saved draft on reopen.
    // See useDurableAutosave.ts's own comments on recoveringRef and
    // recoveryTargetRef for the full mechanism.
    expect(hook).toContain('const recoveringRef = useRef(false)');
    expect(hook).toContain('const recoveryTargetRef = useRef<');

    const contentEffectStart = hook.indexOf('// Instant local mirror');
    const contentEffectBody = hook.slice(contentEffectStart, contentEffectStart + 1200);
    expect(contentEffectBody).toContain('if (recoveringRef.current)');

    // Both resume branches must set recoveringRef before setDraftId, and
    // must eventually clear it (directly when nothing needs restoring,
    // or via the content-effect once the restored content lands).
    const unauthResumeStart = hook.indexOf('the pointer may reference a real server draft');
    const unauthResumeBody = hook.slice(unauthResumeStart, unauthResumeStart + 700);
    expect(unauthResumeBody.indexOf('recoveringRef.current = true')).toBeGreaterThan(-1);
    expect(unauthResumeBody.indexOf('recoveringRef.current = true')).toBeLessThan(unauthResumeBody.indexOf('setDraftId(existingId)'));

    const authResumeStart = hook.indexOf('const data = await res.json();\n            if (cancelledFlag.current) return;\n            draftIdRef.current = data.draft.id;');
    const authResumeBody = hook.slice(authResumeStart, authResumeStart + 500);
    expect(authResumeBody.indexOf('recoveringRef.current = true')).toBeGreaterThan(-1);
    expect(authResumeBody.indexOf('recoveringRef.current = true')).toBeLessThan(authResumeBody.indexOf('setDraftId(data.draft.id)'));
  });
});
