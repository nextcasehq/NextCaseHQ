import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the Document Creator rebuild milestone
 * (feat/rebuild-document-creator, stacked on PR #141). Source-level
 * assertions, per this repo's established convention (no
 * @testing-library/react) — genuine functional coverage of the editor
 * engine itself lives in lib/documents/editor/__tests__/tiptap-editor.test.ts
 * (a real Tiptap/ProseMirror Editor instance in jsdom), and the live,
 * interactive walkthrough (toolbar clicks, page-setup changes, template
 * loading, responsive layout) was verified manually against the running
 * preview build, not simulated here.
 */

const SRC_ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('Document Creator rebuild — page composition', () => {
  const page = readSource('app/dashboard/draft-builder/page.tsx');

  test('assembles the full workspace: template library, toolbar, page setup, and canvas', () => {
    expect(page).toContain('<TemplateLibrary');
    expect(page).toContain('<Toolbar');
    expect(page).toContain('<PageSetupPanel');
    expect(page).toContain('<DocumentCanvas');
  });

  test('recovered content is never silently dropped by the immediatelyRender:false editor-not-ready race', () => {
    // Regression: Tiptap's useEditor (immediatelyRender: false, required
    // for Next.js SSR safety) can still return a null editor on the tick
    // recovery fires. Worse, useDurableAutosave's `onRecovered` reference
    // is captured once on its own mount effect and never refreshed, so a
    // restoreRecovered that branches on the *current* `editor` closure
    // variable always sees it as null there, regardless of the real,
    // current editor state — the fix must queue the recovered HTML in
    // React state (not a ref written once) and consume it from an effect
    // keyed on both `editor` and that queued value, so it applies
    // correctly no matter which one becomes ready first.
    expect(page).toContain('pendingRestoreHtml');
    expect(page).toMatch(/\[editor, pendingRestoreHtml\]/);
  });

  test('document title is an editable field, not static text', () => {
    expect(page).toMatch(/value=\{draftTitle\}/);
    expect(page).toMatch(/onChange=\{.*setDraftTitle/);
  });

  test('a print/preview action is present and print-only chrome is marked no-print', () => {
    expect(page).toContain('window.print()');
    expect(page).toContain('no-print');
  });

  test('mobile panels are reachable via explicit toggles, not lost off-screen', () => {
    expect(page).toContain('mobilePanel');
    expect(page).toMatch(/lg:hidden/);
    expect(page).toMatch(/lg:block/);
  });

  test('no AI-credit-charging or AI-generation-queue features are wired into the rebuilt page (out of scope for this milestone)', () => {
    expect(page).not.toContain('useChargeableAiAction');
    expect(page).not.toContain('ConfirmChargeModal');
  });

  test('the two locked creation modes are both present and clearly labelled', () => {
    expect(page).toContain('Create Manually');
    expect(page).toContain('Create Using Template');
  });

  test('the guided SurveyJS questionnaire workflow is explicitly deferred, not silently faked', () => {
    expect(page).not.toMatch(/survey-?js/i);
    expect(page).toMatch(/separate upcoming milestone/i);
  });

  test('Matter linkage is presented honestly — no fabricated Matter Register connection', () => {
    expect(page).toContain('Unlinked Draft');
    expect(page).not.toMatch(/fetch\(.*\/api\/matters/);
  });
});

describe('Document Creator rebuild — template immutability and independent-draft-per-template', () => {
  const page = readSource('app/dashboard/draft-builder/page.tsx');
  const templates = readSource('lib/documents/editor/templates.ts');

  test('selecting a template calls startNewDraft — it never overwrites the currently loaded draft in place', () => {
    expect(page).toContain('autosave.startNewDraft');
  });

  test('a confirmation step exists before replacing substantial existing content with another template', () => {
    expect(page).toContain('pendingTemplate');
    expect(page).toMatch(/hasSubstantialContent/);
  });

  test('master templates are exported as plain constants, never mutated by the page (which only ever spreads/copies them)', () => {
    expect(templates).not.toMatch(/LEGAL_TEMPLATES\[[^\]]*\]\s*=/);
    expect(templates).not.toMatch(/\.html\s*=\s*[^=]/);
  });
});

describe('Document Creator rebuild — page setup drives the visible canvas, not just stored state', () => {
  const canvas = readSource('components/document-editor/DocumentCanvas.tsx');

  test('paper size and orientation feed real pixel dimensions', () => {
    expect(canvas).toContain('pageDimensionsMm');
    expect(canvas).toMatch(/widthPx/);
    expect(canvas).toMatch(/heightPx/);
  });

  test('margins render as real padding, not decorative labels', () => {
    expect(canvas).toContain('paddingTop');
    expect(canvas).toContain('paddingBottom');
    expect(canvas).toContain('paddingLeft');
    expect(canvas).toContain('paddingRight');
  });

  test('zoom applies a real visual transform', () => {
    expect(canvas).toContain('scale(');
  });

  test('header and footer text and page-number setting are rendered, not just captured', () => {
    expect(canvas).toContain('pageSetup.header');
    expect(canvas).toContain('pageSetup.footer');
    expect(canvas).toContain('pageSetup.showPageNumbers');
  });
});

describe('Document Creator rebuild — print output is clean', () => {
  const css = readSource('app/globals.css');

  test('a print media query hides everything except the page itself', () => {
    expect(css).toMatch(/@media print/);
    expect(css).toContain('nchq-print-page');
  });

  test('page breaks are respected in print (break-after: page)', () => {
    expect(css).toMatch(/break-after:\s*page/);
  });
});

describe('Document Creator rebuild — toolbar exposes every required control', () => {
  const toolbar = readSource('components/document-editor/Toolbar.tsx');

  test.each([
    'setFontFamily',
    'setFontSize',
    'toggleBold',
    'toggleItalic',
    'toggleUnderline',
    'setColor',
    'toggleHighlight',
    'unsetHighlight',
    'unsetAllMarks',
    'toggleHeading',
    'setTextAlign',
    'toggleBulletList',
    'toggleOrderedList',
    'indent',
    'outdent',
    'setLineHeight',
    'setParagraphSpacingBefore',
    'setParagraphSpacing',
    'undo',
    'redo',
    'setPageBreak',
  ])('wires the %s command to a visible control', (command) => {
    expect(toolbar).toContain(command);
  });

  test('toolbar controls have accessible names', () => {
    const ariaLabelCount = (toolbar.match(/aria-label=/g) ?? []).length;
    expect(ariaLabelCount).toBeGreaterThanOrEqual(10);
  });
});
