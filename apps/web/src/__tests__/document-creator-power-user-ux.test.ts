import fs from 'fs';
import path from 'path';

/**
 * Regression coverage for the power-user UX audit's items #1–#7 —
 * maximizing document visibility for someone editing for hours at a time,
 * benchmarked against Google Docs/Notion/Craft/Linear/Pages/Word Web. No
 * React component-rendering test infrastructure exists in this repo (no
 * @testing-library/react), so this asserts at the source-file level — the
 * same established convention as the other document-creator-*.test.ts
 * files.
 */

const SRC_ROOT = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(SRC_ROOT, relativePath), 'utf8');
}

describe('Document Creator — power-user UX audit (items #1-7)', () => {
  const page = readSource('app/dashboard/draft-builder/page.tsx');
  const ribbon = readSource('components/document-editor/Ribbon.tsx');

  test('#1: Page Setup & Properties is a slide-over drawer, never a persistent sidebar', () => {
    // No benchmark editor (Docs, Word, Pages) keeps page setup as
    // permanent chrome — it's touched at most a few times per document.
    // Paper size/orientation/margins now also live in the ribbon's
    // Layout dropdown, so the sidebar was pure duplication on top of
    // being low-frequency.
    expect(page).toContain('pageSetupOpen');
    expect(page).not.toMatch(/<aside[^>]*rightOpen/);
    const drawerStart = page.indexOf('{pageSetupOpen && (');
    expect(drawerStart).toBeGreaterThan(-1);
    const drawerBody = page.slice(drawerStart, drawerStart + 500);
    expect(drawerBody).toContain('rightSidebarContent');
    expect(drawerBody).toContain('bg-black/40');
  });

  test('#2: autosave status is shown in exactly one place — the status bar — not duplicated across header and sidebar', () => {
    // Previously shown 4 times at once: header badge, sidebar "Status"
    // row, sidebar "Autosave Status" row (the same value twice in one
    // panel), and the status bar. StatusBar.tsx is the one place left.
    const headerStart = page.indexOf('<header');
    const headerEnd = page.indexOf('</header>');
    const headerBody = page.slice(headerStart, headerEnd);
    expect(headerBody).not.toContain('AUTOSAVE_STATUS_LABEL[autosave.status]');
    expect(headerBody).not.toContain('AUTOSAVE_STATUS_DOT[autosave.status]');

    const leftSidebarStart = page.indexOf('const leftSidebarContent');
    const leftSidebarEnd = page.indexOf('const rightSidebarContent');
    const leftSidebarBody = page.slice(leftSidebarStart, leftSidebarEnd);
    expect(leftSidebarBody).not.toMatch(/<dt[^>]*>Autosave Status<\/dt>/);
    expect(leftSidebarBody).not.toMatch(/<dt[^>]*>Status<\/dt>/);

    expect(page).toContain('<StatusBar');
  });

  test('#3: Insert/Layout/Export are dropdown menus appended to a single always-visible row — not tabs that hide Home', () => {
    // Regression: the old ribbon TABS hid Bold/Italic/lists/alignment
    // entirely whenever Insert/Layout/Export was active, real friction
    // for someone typing continuously. There is now exactly one toolbar
    // row and no tab-switching state.
    expect(ribbon).not.toContain('activeTab');
    expect(ribbon).not.toContain('RIBBON_TABS');
    expect(ribbon).not.toContain('border-b-2');
    for (const menu of ['Insert', 'Layout', 'Export']) {
      expect(ribbon).toContain(`label="${menu}"`);
    }
    // Bold must appear before any of the three dropdown menus in source
    // order, confirming it's part of the permanently-visible row rather
    // than nested inside one of them.
    const boldIndex = ribbon.indexOf('label="Bold"');
    const insertIndex = ribbon.indexOf('label="Insert"');
    expect(boldIndex).toBeGreaterThan(-1);
    expect(insertIndex).toBeGreaterThan(boldIndex);
  });

  test('#4: the left sidebar\'s draft metadata is trimmed to what is genuinely unique — no duplicate Pages/Words/Characters/Matter/Template rows', () => {
    const leftSidebarStart = page.indexOf('const leftSidebarContent');
    const leftSidebarEnd = page.indexOf('const rightSidebarContent');
    const leftSidebarBody = page.slice(leftSidebarStart, leftSidebarEnd);
    // Pages/Words/Characters duplicated the status bar exactly; Matter
    // always read "Unlinked Draft" (nothing to link to yet); Template
    // repeated what's already visible via the highlighted template card.
    expect(leftSidebarBody).not.toMatch(/<dt[^>]*>Pages<\/dt>/);
    expect(leftSidebarBody).not.toMatch(/<dt[^>]*>Words<\/dt>/);
    expect(leftSidebarBody).not.toMatch(/<dt[^>]*>Characters<\/dt>/);
    expect(leftSidebarBody).not.toMatch(/<dt[^>]*>Matter<\/dt>/);
    expect(leftSidebarBody).not.toMatch(/<dt[^>]*>Template<\/dt>/);
    // Created and Last Saved were the only genuinely unique facts.
    expect(leftSidebarBody).toContain('Created');
    expect(leftSidebarBody).toContain('Last Saved');
  });

  test('#5: the "AI Panel" placeholder section is gone', () => {
    // Same class of dead-weight placeholder as the ribbon's old
    // References/Review/AI tabs: a single italic "reserved for a future
    // milestone" line with zero function, permanently taking sidebar
    // space.
    expect(page).not.toContain('AI Panel');
    expect(page).not.toContain('Reserved for a future milestone');
  });

  test('#6: the page thumbnail rail only renders for genuinely multi-page documents', () => {
    // A single thumbnail has no navigational value — it used to take
    // 60px of permanent width even on a fresh one-page draft.
    const railStart = page.indexOf('<PageThumbnails');
    const guardStart = page.lastIndexOf('{!focusMode && !activeInterview', railStart);
    const guardBody = page.slice(guardStart, railStart);
    expect(guardBody).toContain('pageCount > 1');
  });

  test('#7: the header carries only the title and Focus Mode directly — Dark workspace lives behind a small overflow menu, and the redundant "Document" label is gone', () => {
    const headerStart = page.indexOf('<header');
    const headerEnd = page.indexOf('</header>');
    const headerBody = page.slice(headerStart, headerEnd);
    expect(headerBody).not.toMatch(/>\s*Document\s*</);
    expect(headerBody).toContain('headerMenuOpen');
    expect(headerBody).toContain('Dark workspace');
    expect(headerBody).toContain('⛶ Focus');
    // The Page Setup trigger is universal now (no md:hidden gate) — it
    // replaces what used to be a separate mobile-only toggle plus a
    // desktop-only sidebar-collapse button.
    expect(headerBody).toMatch(/onClick=\{\(\) => setPageSetupOpen\(true\)\}[^}]*\n[^}]*aria-label="Open page setup and properties"/);
  });
});
