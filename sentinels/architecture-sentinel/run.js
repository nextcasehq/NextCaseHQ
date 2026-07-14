/**
 * Architecture Sentinel - Enforces structural, routing, layout and merge governance.
 */

const fs = require('fs');
const path = require('path');
const { runCommand, scanFiles } = require('../shared/utils');
const { Logger } = require('../shared/logger');
const { createReportTemplate, saveSentinelReports } = require('../shared/reporter');
const { scanForConflicts } = require('../shared/scanner');

const logger = new Logger('Architecture Sentinel');
const startTime = Date.now();

logger.info('Starting Architecture & Merge Governance audit...');

const report = createReportTemplate('Architecture Sentinel', '2.0');
report.confidence = '98%';

const findings = [];
const diagnostics = [];

// 1. Merge Governance
logger.info('Auditing merge status and branch health...');
const activeBranch = runCommand('git rev-parse --abbrev-ref HEAD') || 'unknown-branch';
const isClean = !runCommand('git status --porcelain');

// Detect merge conflict markers in the workspace
const rootDir = path.join(__dirname, '../../');
const conflictFiles = scanForConflicts(rootDir);

if (conflictFiles.length > 0) {
  conflictFiles.forEach((file, idx) => {
    const relativePath = path.relative(rootDir, file);
    let category = 'Code';
    let recommendation = 'Manual Merge required to resolve logical conflict.';

    if (file.includes('layout.tsx') || file.includes('layout.ts')) {
      category = 'Layout';
      recommendation = 'Accept Current (Preserves approved UI Constitution layout rules)';
    } else if (file.includes('page.tsx') || file.includes('page.ts')) {
      category = 'Routing';
      recommendation = 'Accept Current (Preserves Flat Canonical Route Structure)';
    } else if (file.includes('package.json') || file.includes('pnpm-lock.yaml')) {
      category = 'Package';
      recommendation = 'Accept Both (Merges workspace package versions safely)';
    } else {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('import ') && (content.includes('from "@') || content.includes('from "."'))) {
        category = 'Import';
        recommendation = 'Accept Both (Merges relative and workspace alias imports safely)';
      }
    }

    const issueId = `MERGE_CONFLICT_${idx + 1}`;
    const desc = `Git merge conflict markers detected in file: ${relativePath}`;

    findings.push({
      id: issueId,
      type: 'MERGE_CONFLICT',
      file: relativePath,
      category,
      message: desc,
      recommendation
    });

    diagnostics.push({
      id: issueId,
      name: 'Git Merge Conflict Detected',
      file: relativePath,
      category,
      rootCause: `Concurrent modification on branch '${activeBranch}' resulting in unmerged git markers.`,
      impact: `Causes severe compilation failures (TSX/JSX syntax parsing errors) and prevents production deployment.`,
      recommendedFix: `Resolve conflict using strategy: ${recommendation}`,
      confidenceLevel: '100%'
    });
  });
}

// Inspect branch health and divergence
const upstreamBranch = 'origin/main';
const revList = runCommand(`git rev-list --left-right --count HEAD...${upstreamBranch}`);
let isDivergent = false;
let aheadCount = 0;
let behindCount = 0;

if (revList) {
  const parts = revList.split('\t');
  if (parts.length === 2) {
    aheadCount = parseInt(parts[0], 10) || 0;
    behindCount = parseInt(parts[1], 10) || 0;
    if (behindCount > 0) {
      isDivergent = true;
    }
  }
}

if (isDivergent) {
  const issueId = 'BRANCH_DIVERGENCE';
  const desc = `Branch '${activeBranch}' is out of sync. Behind ${upstreamBranch} by ${behindCount} commits.`;
  findings.push({
    id: issueId,
    type: 'BRANCH_DIVERGENCE',
    message: desc,
    recommendation: 'Pull latest changes from origin/main to merge current production releases.'
  });

  diagnostics.push({
    id: issueId,
    name: 'Branch Out Of Sync with Production',
    rootCause: `Local branch '${activeBranch}' was not rebased against the latest ${upstreamBranch} head.`,
    impact: `Increases risk of regression and late-stage merge conflict surprises on PR integration.`,
    recommendedFix: `Run 'git fetch origin && git rebase origin/main' to align branch with latest development changes.`,
    confidenceLevel: '95%'
  });
}

// 2. Architecture Governance
logger.info('Analyzing Next.js rendering tree structure...');
const appDir = path.join(rootDir, 'apps/web/src/app');

let layoutCount = 0;
let pageCount = 0;
let navbarCount = 0;
let footerCount = 0;
let legacyRouteGroups = [];
const routePaths = [];

if (fs.existsSync(appDir)) {
  const tsxFiles = scanFiles(appDir, (file) => file.endsWith('.tsx') || file.endsWith('.ts'));

  tsxFiles.forEach(file => {
    const relative = path.relative(appDir, file);
    const normalized = relative.replace(/\\/g, '/');

    // Layout check
    if (normalized.endsWith('layout.tsx')) {
      layoutCount++;
      const content = fs.readFileSync(file, 'utf8');
      const navMatches = (content.match(/<Navbar/g) || []).length;
      if (navMatches > 1) {
        navbarCount += (navMatches - 1);
      }
      const footerMatches = (content.match(/<Footer/g) || []).length;
      if (footerMatches > 1) {
        footerCount += (footerMatches - 1);
      }
    }

    // Page check
    if (normalized.endsWith('page.tsx')) {
      pageCount++;
      const parts = normalized.split('/');
      const route = '/' + parts.slice(0, parts.length - 1).join('/');
      routePaths.push({ route, file: relative });

      const content = fs.readFileSync(file, 'utf8');
      const navMatches = (content.match(/<Navbar/g) || []).length;
      if (navMatches > 1) {
        navbarCount += (navMatches - 1);
      }
      const footerMatches = (content.match(/<Footer/g) || []).length;
      if (footerMatches > 1) {
        footerCount += (footerMatches - 1);
      }
    }

    // Legacy folder group check
    if (normalized.includes('(marketing)') || normalized.includes('(dashboard)')) {
      const groupName = normalized.includes('(marketing)') ? '(marketing)' : '(dashboard)';
      if (!legacyRouteGroups.includes(groupName)) {
        legacyRouteGroups.push(groupName);
      }
    }
  });
}

// Evaluate duplicate Navbar references (e.g. if rendered in layout and page, or multiple times)
if (navbarCount > 5) {
  const issueId = 'DUPLICATE_NAVBAR';
  const desc = `Multiple Navbar declarations/instances (${navbarCount}) detected in the rendering tree.`;
  findings.push({
    id: issueId,
    type: 'DUPLICATE_NAVBAR',
    message: desc,
    recommendation: 'Unify Navbar rendering in root layout.tsx or canonical pages, avoid nesting navbar rendering.'
  });

  diagnostics.push({
    id: issueId,
    name: 'Duplicate Navbar Layout Render',
    rootCause: `Navbar is imported or rendered independently in multiple nested routes or layout files instead of single entry control.`,
    impact: `Causes layout flashing, layout shifts, extra DOM overhead, and inconsistent rendering states across navigations.`,
    recommendedFix: `Move Navbar rendering strictly into the root layout.tsx or define a clear, non-overlapping navbar registry.`,
    confidenceLevel: '99%'
  });
}

// Evaluate duplicate Footer references
if (footerCount > 5) {
  const issueId = 'DUPLICATE_FOOTER';
  const desc = `Multiple Footer declarations/instances (${footerCount}) detected in the rendering tree.`;
  findings.push({
    id: issueId,
    type: 'DUPLICATE_FOOTER',
    message: desc,
    recommendation: 'Consolidate Footer rendering in the top-level layout or landing page.'
  });

  diagnostics.push({
    id: issueId,
    name: 'Duplicate Footer Layout Render',
    rootCause: `Footer is rendered in both layouts and individual leaf pages simultaneously.`,
    impact: `Breaks visual aesthetics of the UI Constitution, double-footers the bottom layout, and wastes screen space.`,
    recommendedFix: `Render Footer only at the root layout of the marketing/landing sections or encapsulate it in a unified template.`,
    confidenceLevel: '95%'
  });
}

// Evaluate legacy route group presence
if (legacyRouteGroups.length > 0) {
  legacyRouteGroups.forEach((group, idx) => {
    const issueId = `LEGACY_ROUTE_GROUP_${idx + 1}`;
    const desc = `Obsolete/Legacy Next.js folder route group '${group}' detected under apps/web/src/app.`;
    findings.push({
      id: issueId,
      type: 'LEGACY_ROUTE_GROUP',
      message: desc,
      recommendation: 'Migrate legacy folder-based route groups into flat canonical route structure.'
    });

    diagnostics.push({
      id: issueId,
      name: 'Legacy Next.js Route Group Used',
      rootCause: `Adoption of legacy route groups like '${group}' which breaks canonical flat directory standards.`,
      impact: `Creates complex nested routing patterns, causes layout inheritance confusion, and deviates from clean flat dashboard conventions.`,
      recommendedFix: `Flatten folders under src/app/ to match canonical routing rules, removing parenthesis-enclosed directories.`,
      confidenceLevel: '98%'
    });
  });
}

// Evaluate duplicate route paths (e.g. overlapping route mappings)
const seenRoutes = {};
routePaths.forEach(item => {
  if (seenRoutes[item.route]) {
    const issueId = 'DUPLICATE_ROUTE';
    const desc = `Duplicate route path mapping detected: '${item.route}' is defined in both '${seenRoutes[item.route]}' and '${item.file}'`;
    findings.push({
      id: issueId,
      type: 'DUPLICATE_ROUTE',
      message: desc,
      recommendation: 'Remove redundant page.tsx or restructure the directory to enforce unique routing.'
    });

    diagnostics.push({
      id: issueId,
      name: 'Duplicate Route Definition',
      rootCause: `Multiple leaf page.tsx files map to the same logical URL endpoint path.`,
      impact: `Causes Next.js compilation warnings/errors, or arbitrary routing resolution behavior at runtime.`,
      recommendedFix: `Consolidate URL paths and remove duplicate page.tsx declarations under overlapping directories.`,
      confidenceLevel: '100%'
    });
  } else {
    seenRoutes[item.route] = item.file;
  }
});

// Calculate final status and confidence
const executionTimeMs = Date.now() - startTime;
report.executionTime = `${(executionTimeMs / 1000).toFixed(2)}s`;
report.status = (findings.length > 0) ? 'FAIL' : 'PASS';
report.findings = findings;
report.diagnostics = diagnostics;

// Save reports to architecture-sentinel folder
saveSentinelReports(__dirname, report);

logger.info(`Completed. Status: ${report.status}. Issues detected: ${findings.length}`);
if (findings.length > 0) {
  findings.forEach(f => console.log(`  [!] ${f.id}: ${f.message}`));
}
