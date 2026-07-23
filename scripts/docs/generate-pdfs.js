#!/usr/bin/env node
/**
 * Renders the User Manual and Administrator Manual (docs/knowledge-base/
 * *.md) into printable PDFs via a headless Chromium print-to-PDF pass —
 * no pandoc/wkhtmltopdf dependency, reusing the same Playwright Chromium
 * already installed in this environment for browser testing.
 *
 * Usage: node scripts/docs/generate-pdfs.js
 * Output: docs/knowledge-base/pdf/user-manual.pdf, admin-manual.pdf
 */
const fs = require('fs');
const path = require('path');
const { marked } = require(path.join(__dirname, '..', '..', 'apps', 'web', 'node_modules', 'marked'));
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const KB_DIR = path.join(__dirname, '..', '..', 'docs', 'knowledge-base');
const OUT_DIR = path.join(KB_DIR, 'pdf');

const DOCUMENTS = [
  { source: 'user-manual.md', title: 'NextCaseHQ — User Manual', output: 'user-manual.pdf' },
  { source: 'admin-manual.md', title: 'NextCaseHQ — Administrator Manual', output: 'admin-manual.pdf' },
];

function wrapHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { margin: 24mm 20mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #241E17; line-height: 1.6; font-size: 11pt; }
  h1 { font-size: 22pt; font-weight: 900; color: #111111; border-bottom: 2px solid #8A6D2F; padding-bottom: 8pt; margin-top: 0; }
  h2 { font-size: 15pt; font-weight: 900; color: #111111; margin-top: 28pt; page-break-after: avoid; }
  h3 { font-size: 12pt; font-weight: 800; color: #3A3222; margin-top: 18pt; page-break-after: avoid; }
  h4 { font-size: 11pt; font-weight: 700; color: #3A3222; }
  p, li { color: #4A4130; }
  a { color: #8A6D2F; }
  code { background: #FBF6EA; padding: 1pt 4pt; border-radius: 3pt; }
  hr { border: none; border-top: 1px solid #E7DFC9; margin: 20pt 0; }
  table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 10pt; }
  th, td { border: 1px solid #E7DFC9; padding: 6pt 8pt; text-align: left; }
  th { background: #FBF8F1; }
  .cover { text-align: center; margin-bottom: 40pt; }
  .cover .brand { font-size: 13pt; font-weight: 900; color: #8A6D2F; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8pt; }
</style>
</head>
<body>
<div class="cover"><p class="brand">NextCaseHQ</p></div>
${bodyHtml}
</body>
</html>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  for (const doc of DOCUMENTS) {
    const sourcePath = path.join(KB_DIR, doc.source);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`[generate-pdfs] Skipping ${doc.source} — not found.`);
      continue;
    }
    const markdown = fs.readFileSync(sourcePath, 'utf-8');
    const bodyHtml = marked.parse(markdown, { async: false });
    const html = wrapHtml(doc.title, bodyHtml);

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const outputPath = path.join(OUT_DIR, doc.output);
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate:
        '<div style="font-size:8px; width:100%; text-align:center; color:#B0A588;">NextCaseHQ &mdash; <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin: { top: '20mm', bottom: '16mm', left: '18mm', right: '18mm' },
    });
    await page.close();
    const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(0);
    console.log(`[generate-pdfs] Wrote ${doc.output} (${sizeKb} KB)`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error('[generate-pdfs] Failed:', err);
  process.exit(1);
});
