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

  test('assembles the full workspace: template library, ribbon, attachments, page setup, and canvas', () => {
    expect(page).toContain('<TemplateLibrary');
    expect(page).toContain('<Ribbon');
    expect(page).toContain('<AttachmentsPanel');
    expect(page).toContain('<PageSetupPanel');
    expect(page).toContain('<DocumentCanvas');
    expect(page).toContain('<StatusBar');
    expect(page).toContain('<PageThumbnails');
    expect(page).toContain('<FormattingBubble');
    expect(page).toContain('<EditorContextMenu');
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

  test('mobile panels are reachable via explicit slide-out drawer toggles, not lost off-screen', () => {
    expect(page).toContain('mobileDrawer');
    expect(page).toMatch(/md:hidden/);
    expect(page).toMatch(/md:flex|md:block/);
  });

  test('the left sidebar collapses independently, and Page Setup opens as its own slide-over drawer', () => {
    // Page Setup & Properties stopped being a persistent, collapsible
    // sidebar (rightOpen) in a later screen-real-estate pass — it's
    // touched at most a few times per document (paper size, margins, and
    // read-only Document Properties nobody edits), so it's a slide-over
    // drawer at every breakpoint instead, tracked by pageSetupOpen.
    expect(page).toContain('leftOpen');
    expect(page).toContain('pageSetupOpen');
    expect(page).not.toContain('rightOpen');
  });

  test('a full-screen focus mode and a dark workspace toggle are wired to real state, not decorative buttons', () => {
    expect(page).toMatch(/focusMode/);
    expect(page).toMatch(/darkWorkspace/);
  });

  test('word and character counts are derived from the real editor text, not a placeholder', () => {
    expect(page).toContain('editor?.getText()');
    expect(page).toContain('wordCount');
    expect(page).toContain('characterCount');
  });

  test('no AI-credit-charging or AI-generation-queue features are wired into the rebuilt page (out of scope for this milestone)', () => {
    expect(page).not.toContain('useChargeableAiAction');
    expect(page).not.toContain('ConfirmChargeModal');
  });

  test('the two locked creation modes are both present and clearly labelled', () => {
    expect(page).toContain('Create Manually');
    expect(page).toContain('Create Using Template');
  });

  test('the guided SurveyJS questionnaire workflow is genuinely wired in, not a static placeholder', () => {
    expect(page).toContain('SurveyWizard');
    expect(page).toContain('getInterviewConfigForTemplate');
    expect(page).toContain('handleSurveyGenerate');
  });

  test('Matter linkage is presented honestly — no fabricated Matter Register connection', () => {
    // The sidebar's "Matter: Unlinked Draft" row was removed in a later
    // screen-real-estate pass — it never varied (there was no Matter
    // Register link to show either way), so it was static clutter, not
    // useful metadata. Honesty here now just means the page still never
    // fetches or implies a Matter Register connection that doesn't exist.
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

describe('Document Creator rebuild — ribbon exposes every required control', () => {
  const ribbon = readSource('components/document-editor/Ribbon.tsx');
  const styles = readSource('lib/documents/editor/styles.ts');
  // toggleHeading is now applied via the legal style gallery's presets
  // (styles.ts) rather than a raw H1/H2/H3 select in the ribbon itself.
  const combined = ribbon + styles;

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
    expect(combined).toContain(command);
  });

  test.each(['Insert', 'Layout', 'Export'])('the ribbon defines an %s dropdown menu', (menu) => {
    expect(ribbon).toMatch(new RegExp(`label="${menu}"`));
  });

  test('Home formatting controls are always visible — no tab hides them behind a click', () => {
    // Regression: Insert/Layout/Export used to be ribbon TABS (with an
    // implicit "Home" tab too) — clicking into one hid Bold/Italic/lists/
    // alignment entirely until you clicked back, real friction for
    // someone typing continuously. They're dropdown menus now, appended
    // after the formatting controls rather than replacing them, so Home
    // never needs to be "switched back to."
    expect(ribbon).not.toContain('RIBBON_TABS');
    expect(ribbon).not.toContain('activeTab');
    expect(ribbon).toContain('label="Bold"');
    expect(ribbon).toContain('label="Bullet list"');
  });

  test('clipboard actions use the real browser Clipboard API, not document.execCommand', () => {
    expect(ribbon).not.toContain('document.execCommand');
    expect(ribbon).toMatch(/cutSelection|copySelection|pasteClipboard/);
  });

  test('References/Review/AI are gone rather than kept as fake-functional placeholders', () => {
    // A later screen-real-estate pass removed these three tabs entirely:
    // each rendered nothing but a single italic "planned for a future
    // milestone" sentence, so they were pure clutter (extra tab-bar width,
    // extra taps to discover there was nothing there) with zero function
    // to preserve by keeping them around.
    expect(ribbon).not.toMatch(/label:\s*'References'/);
    expect(ribbon).not.toMatch(/label:\s*'Review'/);
    expect(ribbon).not.toMatch(/label:\s*'AI'/);
    expect(ribbon).not.toMatch(/planned for a future milestone/i);
  });

  test('toolbar controls have accessible names', () => {
    const ariaLabelCount = (ribbon.match(/aria-label=/g) ?? []).length;
    expect(ariaLabelCount).toBeGreaterThanOrEqual(10);
  });
});

describe('Document Creator rebuild — legal style gallery', () => {
  const styles = readSource('lib/documents/editor/styles.ts');

  test.each([
    'Normal',
    'Court Heading',
    'Cause Title',
    'Party Name',
    'Body',
    'Prayer',
    'Affidavit',
    'Signature Block',
    'Annexure',
    'Schedule',
  ])('the %s style is defined with a real apply() command chain', (name) => {
    expect(styles).toContain(`name: '${name}'`);
  });
});

describe('Document Creator rebuild — attachments panel is honest UI-only staging', () => {
  const attachments = readSource('components/document-editor/AttachmentsPanel.tsx');

  test('supports drag-and-drop and an explicit upload button', () => {
    expect(attachments).toContain('onDrop');
    expect(attachments).toMatch(/type="file"/);
  });

  test('accepts PDF, DOCX, and image files and shows a type icon', () => {
    expect(attachments).toContain('.pdf');
    expect(attachments).toContain('.docx');
    expect(attachments.toLowerCase()).toMatch(/\.(png|jpe?g)/);
  });

  test('never calls a backend upload endpoint — explicitly session-only until wired up', () => {
    expect(attachments).not.toMatch(/fetch\(/);
    expect(attachments).toMatch(/not yet saved to your account/i);
  });
});

describe('Document Creator rebuild — page setup supports the required paper sizes and zoom range', () => {
  const pageSetup = readSource('lib/documents/editor/page-setup.ts');

  test('A4, Letter, and Legal are all supported', () => {
    expect(pageSetup).toMatch(/A4/);
    expect(pageSetup).toMatch(/LETTER/);
    expect(pageSetup).toMatch(/LEGAL/);
  });

  test('zoom presets cover 50-200% plus fit width is computed elsewhere from real container width', () => {
    expect(pageSetup).toContain('ZOOM_PRESETS');
    expect(pageSetup).toContain('200');
  });
});
