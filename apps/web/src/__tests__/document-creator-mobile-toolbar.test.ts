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

  test('the desktop ribbon compacts at tablet widths and restores full size only at lg (desktop)', () => {
    // Desktop stays exactly as-is at lg+; only the un-prefixed (tablet)
    // sizing changed, keeping the requirement "Desktop: keep the current
    // desktop ribbon" true at the lg breakpoint and up.
    expect(ribbon).toContain('lg:min-w-[2rem] lg:h-8 lg:px-2');
    expect(ribbon).toContain('lg:min-h-[76px]');
  });

  test('Fit Width zoom auto-engages below desktop (lg) so the page is reachable without horizontal scrolling', () => {
    // Regression: at the 100%-zoom desktop default, an A4 page (~794px)
    // renders centered and far wider than a phone viewport, leaving the
    // real contenteditable mostly off-screen — a Playwright click at a
    // plausible on-screen point landed on <body>, not the editor, and
    // typing was silently dropped (never reached the autosave content
    // effect). Auto-engaging the existing Fit Width mechanism on mount
    // fixes this without inventing a second zoom system.
    expect(page).toContain("window.matchMedia('(max-width: 1023px)').matches");
    expect(page).toContain('computeFitWidthZoom();');
  });

  test('Fit Width is recomputed when a template swap resets pageSetup, not just on window resize', () => {
    // Regression: selecting a template replaces pageSetup wholesale
    // (zoom: 100), silently undoing Fit Width. Depending only on
    // paperSize/orientation misses same-size templates (e.g. two A4
    // portrait templates) — selectedTemplateId must be in the dependency
    // list too.
    expect(page).toMatch(
      /if \(zoomMode === 'fit-width'\) computeFitWidthZoom\(\);[\s\S]{0,120}\[pageSetup\.paperSize, pageSetup\.orientation, selectedTemplateId\]/
    );
  });
});
