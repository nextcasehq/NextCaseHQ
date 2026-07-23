#!/usr/bin/env node
/**
 * Copies the authored knowledge base (docs/knowledge-base/*.md) into
 * apps/web/src/content/help/, which is what the in-app Help Centre
 * (apps/web/src/lib/help/content.ts) actually reads at request time.
 * docs/knowledge-base/ stays the single source of truth for authoring;
 * this script is the one place that content becomes part of the deployed
 * app. Run after editing any knowledge-base markdown file.
 *
 * Usage: node scripts/docs/sync-help-content.js
 */
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'docs', 'knowledge-base');

const HELP_DEST_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'content', 'help');
const HELP_FILES = ['user-manual.md', 'admin-manual.md', 'workflow-library.md', 'faq.md', 'glossary.md'];

const RESOURCE_DEST_DIR = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'content', 'legal-resources');
const RESOURCE_FILES = ['practice-guides.md'];

function syncFiles(destDir, files) {
  fs.mkdirSync(destDir, { recursive: true });
  let copied = 0;
  for (const file of files) {
    const sourcePath = path.join(SOURCE_DIR, file);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`[sync-help-content] Skipping ${file} — not found in docs/knowledge-base/`);
      continue;
    }
    fs.copyFileSync(sourcePath, path.join(destDir, file));
    copied += 1;
  }
  return copied;
}

const helpCopied = syncFiles(HELP_DEST_DIR, HELP_FILES);
const resourceCopied = syncFiles(RESOURCE_DEST_DIR, RESOURCE_FILES);

console.log(`[sync-help-content] Copied ${helpCopied}/${HELP_FILES.length} files into apps/web/src/content/help/`);
console.log(`[sync-help-content] Copied ${resourceCopied}/${RESOURCE_FILES.length} files into apps/web/src/content/legal-resources/`);
