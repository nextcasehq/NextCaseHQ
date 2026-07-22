import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the dedicated mobile editing experience — a
 * compact MobileToolbar (not a shrunk copy of the desktop Ribbon) plus an
 * auto-engaged Fit Width zoom below desktop widths. No React
 * component-rendering test infrastructure exists in this repo (no
 * @testing-library/react), so this asserts at the source-file level — the
 * same established convention as document-creator-autosave-ui.test.ts.
 */

const SRC_ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('Document Creator — dedicated mobile editing experience', () => {
  const page = readSource('app/dashboard/draft-builder/page.tsx');
  const mobileToolbar = readSource('components/document-editor/MobileToolbar.tsx');
  const ribbon = readSource('components/document-editor/Ribbon.tsx');

  test('the desktop ribbon is hidden below md, and MobileToolbar takes its place', () => {
    expect(page).toContain("from '@/components/document-editor/MobileToolbar'");
    expect(page).toMatch(/px-4 md:px-6 pt-3 hidden md:block/);
    expect(page).toContain('<MobileToolbar editor={editor} onPrint={handlePrint} />');
  });

  test('MobileToolbar renders only below md and stays out of print output', () => {
    expect(mobileToolbar).toContain("className=\"no-print md:hidden shrink-0");
  });

  test('the primary row exposes only the highest-frequency actions, not the full ribbon', () => {
    for (const action of ['Undo', 'Redo', 'Bold', 'Italic', 'Underline', 'Bullet list', 'Numbered list', 'More formatting options']) {
      expect(mobileToolbar).toContain(`label="${action}"`);
    }
    // Deliberately NOT in the always-visible row — these live behind More.
    expect(mobileToolbar.indexOf('label="More formatting options"')).toBeGreaterThan(
      mobileToolbar.indexOf('label="Bullet list"')
    );
  });

  test('primary-row buttons use explicit pixel sizing, not the repo\'s doubled spacing scale (w-8/h-8 == 64px here)', () => {
    // Regression: tailwind.config.ts overrides spacing['8'] to 64px for the
    // desktop ribbon's deliberately chunky buttons. w-8/h-8 on MiniButton
    // silently produced 64px touch targets instead of the intended ~34px,
    // overflowing the primary row at the narrowest supported width (360px).
    expect(mobileToolbar).toContain('w-[34px] h-[34px]');
    const miniButtonDefStart = mobileToolbar.indexOf('function MiniButton');
    const miniButtonDefEnd = mobileToolbar.indexOf('\n}', miniButtonDefStart);
    const miniButtonDef = mobileToolbar.slice(miniButtonDefStart, miniButtonDefEnd);
    expect(miniButtonDef).not.toMatch(/\bw-8\b/);
  });

  test('secondary formatting (font, color, alignment, paragraph spacing, styles, clipboard, page break, print) lives in a "More" bottom sheet', () => {
    expect(mobileToolbar).toContain('role="dialog"');
    expect(mobileToolbar).toContain('More Formatting');
    for (const section of ['Clipboard', 'Font', 'Color', 'Paragraph', 'Styles', 'Page']) {
      expect(mobileToolbar).toContain(`label="${section}"`);
    }
  });

  test('the ribbon is uniformly compact at every breakpoint — no separate chunky desktop sizing', () => {
    // A later screen-real-estate pass compacted the ribbon everywhere,
    // including desktop: buttons are a single explicit 26px height at all
    // breakpoints (not the old lg:-prefixed 64px-scale variant), and no
    // group caption row ("CLIPBOARD", "FONT", ...) adds an extra text line.
    expect(ribbon).toContain("h-[26px]");
    expect(ribbon).not.toMatch(/lg:h-8|lg:min-h-\[76px\]/);
  });

  test('Fit Width zoom auto-engages on mount at every viewport width, not just below desktop', () => {
    // Originally: at the 100%-zoom desktop default, an A4 page (~794px)
    // rendered centered and far wider than a phone viewport, leaving the
    // real contenteditable mostly off-screen — a Playwright click at a
    // plausible on-screen point landed on <body>, not the editor, and
    // typing was silently dropped (never reached the autosave content
    // effect). Auto-engaging Fit Width on mount fixed that below desktop.
    //
    // A later screen-real-estate pass made this unconditional: a fixed
    // 100% zoom also left a large empty grey margin on wide desktop
    // windows — real drafting space sitting unused — so Fit Width is now
    // the default everywhere, with the explicit 50–200% buttons still
    // available for anyone who wants the page at its literal print size.
    const mountEffectStart = page.indexOf('Fit Width now auto-engages on EVERY viewport');
    expect(mountEffectStart).toBeGreaterThan(-1);
    const mountEffectBody = page.slice(mountEffectStart, mountEffectStart + 700);
    expect(mountEffectBody).toContain('React.useEffect(() => {\n    computeFitWidthZoom();');
    expect(mountEffectBody).not.toContain("matchMedia('(max-width: 1023px)')");
  });

  test('Fit Width is recomputed when a template swap resets pageSetup, not just on window resize', () => {
    // Regression: selecting a template replaces pageSetup wholesale
    // (zoom: 100), silently undoing Fit Width. Depending only on
    // paperSize/orientation misses same-size templates (e.g. two A4
    // portrait templates) — selectedTemplateId must be in the dependency
    // list too.
    expect(page).toMatch(
      /if \(zoomMode === 'fit-width'\) computeFitWidthZoom\(\);[\s\S]{0,200}\[pageSetup\.paperSize, pageSetup\.orientation, selectedTemplateId, leftOpen, rightOpen\]/
    );
  });

  test('both sidebars default to collapsed below desktop (lg), reusing the existing expand/collapse toggle', () => {
    // Regression: on tablet, both sidebars stayed permanently open (only
    // mobile got drawers), squeezing the canvas down to ~130px wide —
    // even the 50% zoom floor didn't fit, so the page silently overflowed
    // behind the left sidebar and clicks meant for the editor landed on
    // sidebar content instead. Defaulting collapsed below lg reuses the
    // desktop-only "reclaim canvas space" toggle that already existed.
    const collapseEffectStart = page.indexOf("if (window.matchMedia('(max-width: 1023px)').matches) {\n      setLeftOpen(false);");
    expect(collapseEffectStart).toBeGreaterThan(-1);
  });

  test('the sidebar auto-collapse defaults leftOpen/rightOpen to true first (matching the server-rendered default) to avoid a hydration mismatch', () => {
    expect(page).toContain('const [leftOpen, setLeftOpen] = React.useState(true)');
    expect(page).toContain('const [rightOpen, setRightOpen] = React.useState(true)');
  });
});
