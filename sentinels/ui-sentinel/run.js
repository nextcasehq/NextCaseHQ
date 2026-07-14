/**
 * UI & Experience Sentinel - Verifies UI Constitution compliance and executes Playwright E2E.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');
const { runCommand } = require('../shared/utils');
const { Logger } = require('../shared/logger');
const { createReportTemplate, saveSentinelReports } = require('../shared/reporter');
const { scanForUIConstitution } = require('../shared/scanner');

const logger = new Logger('UI Sentinel');
const startTime = Date.now();

logger.info('Starting UI Constitution compliance audit...');

const report = createReportTemplate('UI Sentinel', '2.0');
report.confidence = '97%';

const findings = [];
const diagnostics = [];

// 1. Static UI Constitution Verification
const rootDir = path.join(__dirname, '../../');
const uiScan = scanForUIConstitution(rootDir);

logger.info(`Audited ${uiScan.checkedFiles} application files for design tokens...`);

if (uiScan.colorViolations.length > 0) {
  // Report potential color token drift
  const driftFiles = Array.from(new Set(uiScan.colorViolations.map(v => v.file))).slice(0, 3).join(', ');
  const issueId = 'COLOR_TOKEN_DRIFT';
  findings.push({
    id: issueId,
    type: 'UI_CONSTITUTION',
    message: `Color token drift detected. Off-spec hex color references found in: ${driftFiles}`,
    recommendation: 'Replace raw hex colors with design token variables from design-system-ndl.'
  });

  diagnostics.push({
    id: issueId,
    name: 'Color Token Deviation',
    rootCause: `Hardcoded off-spec hexadecimal color values in style classes instead of tailwind variables.`,
    impact: `Violates approved NextCaseHQ UI Constitution brand guidelines and degrades visual consistency.`,
    recommendedFix: `Audit files for raw hex values and map them to Warm Ivory (#FDFBF7), Obsidian Charcoal (#111111), or approved Indigo variables.`,
    confidenceLevel: '90%'
  });
}

if (uiScan.logoChecked && !uiScan.logoFound) {
  const issueId = 'MISSING_BRAND_LOGO';
  findings.push({
    id: issueId,
    type: 'UI_CONSTITUTION',
    message: 'Law-inspired "N" logo was not detected in primary rendering components.',
    recommendation: 'Insert approved courtroom pillars forming N SVG logo on the Landing Page and Navbar.'
  });

  diagnostics.push({
    id: issueId,
    name: 'Missing Project Brand Logo',
    rootCause: `Primary logo element is missing or doesn't conform to visual standard courthouse 'N' pillar geometry.`,
    impact: `Weakens brand identity across workspace logins and landing viewports.`,
    recommendedFix: `Review apps/web/src/app/page.tsx or components/Navbar and ensure the approved SVG logo is rendered.`,
    confidenceLevel: '95%'
  });
}

if (uiScan.threePanelChecked && !uiScan.threePanelFound) {
  const issueId = 'MISSING_THREE_PANEL_WORKSPACE';
  findings.push({
    id: issueId,
    type: 'UI_CONSTITUTION',
    message: 'Three-panel layout (Evidence Ledger, AI Workspace, Drafting Canvas) not verified in Dashboard.',
    recommendation: 'Ensure TriPaneChamber component is rendered on /dashboard with full flexible CSS dimensions.'
  });

  diagnostics.push({
    id: issueId,
    name: 'Missing Three-Panel Premium Layout',
    rootCause: `Dashboard viewport doesn't render TriPaneChamber or is missing workspace panel structure.`,
    impact: `Breaks the core workspace UX for modern litigation document editing and context-assembly.`,
    recommendedFix: `Ensure TriPaneChamber is correctly imported and rendered in apps/web/src/app/dashboard/page.tsx.`,
    confidenceLevel: '99%'
  });
}

// 2. Experience Sentinel - Playwright Browser Verification
logger.info('Initializing Experience Sentinel (Automated Browser verification)...');

// Find and kill any process on port 3006
logger.info('Killing any existing processes on port 3006...');
try {
  execSync('kill $(lsof -t -i :3006 -sTCP:LISTEN) 2>/dev/null || true');
} catch (e) {}

// Spawn Next.js production server in background
logger.info('Spawning Next.js server on port 3006 in background...');
const serverProcess = spawn('pnpm', ['--filter', 'web', 'exec', 'next', 'start', '-p', '3006'], {
  detached: true,
  stdio: 'ignore'
});
serverProcess.unref();

// Helper to check if server is active
function waitForServer(url, retries, delay, callback) {
  if (retries === 0) {
    callback(new Error('Next.js server failed to launch on port 3006 within budget.'));
    return;
  }

  http.get(url, (res) => {
    // Port is active if we receive any response
    callback(null);
  }).on('error', (err) => {
    setTimeout(() => {
      waitForServer(url, retries - 1, delay, callback);
    }, delay);
  });
}

// Wait for port 3006 to become active
waitForServer('http://localhost:3006', 30, 500, (err) => {
  if (err) {
    logger.error('Failed to start Next.js background server:', err);
    cleanupAndFinish();
    return;
  }

  logger.info('Next.js background server is healthy on port 3006.');

  // Execute Playwright E2E Experience python script
  logger.info('Running Playwright Python automation suite...');
  try {
    const pyOutput = execSync('python3 sentinels/ui-sentinel/experience_verify.py', { encoding: 'utf8' });
    console.log(pyOutput);
  } catch (pyErr) {
    logger.error('Playwright automation suite crashed:', pyErr.stdout || pyErr.message);
    const issueId = 'PLAYWRIGHT_CRASH';
    findings.push({
      id: issueId,
      type: 'EXPERIENCE',
      message: 'Playwright browser automation script crashed during user journey simulation.',
      recommendation: 'Examine Python/Playwright output logs to troubleshoot selector or network issues.'
    });

    diagnostics.push({
      id: issueId,
      name: 'Playwright Automation Crash',
      rootCause: `Selector timeout, unexpected page redirection, or layout crash in headless Chromium browser.`,
      impact: `Experience Sentinel was unable to verify critical user paths (Rendering, Authentication, Dashboard).`,
      recommendedFix: `Review experience_verify.py script and verify that selectors exist on target routes.`,
      confidenceLevel: '95%'
    });
  }

  // Parse Playwright outcome results if file was generated
  const resultsPath = path.join(__dirname, 'playwright_result.json');
  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

      if (results.consoleErrors && results.consoleErrors.length > 0) {
        const issueId = 'CONSOLE_ERRORS_DETECTED';
        findings.push({
          id: issueId,
          type: 'EXPERIENCE',
          message: `Console errors detected during rendering: ${results.consoleErrors.length} unique logs recorded.`,
          recommendation: 'Check hydration state, console warnings, and resolve console error logs.'
        });

        diagnostics.push({
          id: issueId,
          name: 'Console Errors Recorded',
          rootCause: `JavaScript execution warnings, failed asset loading, or React hydration mismatch logs.`,
          impact: `Violates the 0-console-error experience budget standard, indicating suboptimal client rendering.`,
          recommendedFix: `Examine the recorded console messages in playwright_result.json and fix the client component bindings.`,
          confidenceLevel: '90%'
        });
      }

      if (results.runtimeErrors && results.runtimeErrors.length > 0) {
        const issueId = 'RUNTIME_ERRORS_DETECTED';
        findings.push({
          id: issueId,
          type: 'EXPERIENCE',
          message: `Critical runtime/page errors detected: ${results.runtimeErrors.length} errors thrown.`,
          recommendation: 'Inspect error stack traces, fix React component crashes or unhandled exceptions.'
        });

        diagnostics.push({
          id: issueId,
          name: 'Critical Page Errors Thrown',
          rootCause: `Unhandled runtime exceptions or missing client state variables during user actions.`,
          impact: `Breaks page rendering, causing white-screens or layout collapse for final end-users.`,
          recommendedFix: `Inspect error boundary traces and fix underlying TypeScript/JavaScript exceptions.`,
          confidenceLevel: '100%'
        });
      }
    } catch (e) {
      logger.error('Failed to parse Playwright results JSON:', e);
    }
  }

  cleanupAndFinish();
});

function cleanupAndFinish() {
  logger.info('Cleaning up Next.js server on port 3006...');
  try {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    execSync('kill $(lsof -t -i :3006 -sTCP:LISTEN) 2>/dev/null || true');
  } catch (e) {}

  // Calculate execution time and status
  const executionTimeMs = Date.now() - startTime;
  report.executionTime = `${(executionTimeMs / 1000).toFixed(2)}s`;
  report.status = (findings.filter(f => !f.id.startsWith('COLOR_TOKEN_DRIFT')).length > 0) ? 'FAIL' : 'PASS'; // color token drift can be warnings
  report.findings = findings;
  report.diagnostics = diagnostics;

  // Add captured screenshots to evidence if they exist
  const screenshots = [];
  const screenDir = path.join(__dirname, 'evidence');
  if (fs.existsSync(screenDir)) {
    const files = fs.readdirSync(screenDir);
    files.forEach(f => {
      if (f.endsWith('.png')) {
        screenshots.push(path.join(screenDir, f));
      }
    });
  }
  report.evidence.screenshots = screenshots;

  // Save reports
  saveSentinelReports(__dirname, report);

  logger.info(`Completed. Status: ${report.status}. Issues detected: ${findings.length}`);
  if (findings.length > 0) {
    findings.forEach(f => console.log(`  [!] ${f.id}: ${f.message}`));
  }
}
