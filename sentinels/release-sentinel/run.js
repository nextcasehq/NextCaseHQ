const fs = require('fs');
const path = require('path');
const utils = require('../shared/utils');
const config = require('../shared/config.json');
const recovery = require('../shared/recovery');
const reporter = require('../shared/reporter');

const archSentinel = require('../architecture-sentinel/run');
const buildSentinel = require('../build-sentinel/run');
const uiSentinel = require('../ui-sentinel/run');
const compSentinel = require('../compiler-sentinel/run');
const browserVerify = require('../ui-sentinel/browser-verify');

function run(mode = process.env.INSPECTION_MODE || 'Repository') {
  const metadata = utils.getGitMetadata();

  console.log('==================================================================');
  console.log(`🚀 INITIALIZING NEXTCASEHQ SENTINEL GOVERNANCE ENGINE v2.0 [Mode: ${mode}]`);
  console.log('==================================================================');

  // 1. Run each Sentinel inside try-catch fault isolation using our recovery system
  const archReport = recovery.runWithRecovery('Architecture Sentinel', archSentinel.run, mode);
  const buildReport = recovery.runWithRecovery('Build Sentinel', buildSentinel.run, mode);
  const uiReport = recovery.runWithRecovery('UI Sentinel', uiSentinel.run, mode);
  const compReport = recovery.runWithRecovery('Compiler Diagnostics Sentinel', compSentinel.run, mode);

  // 2. Perform live structural layout rendering validation (Phase 5)
  const browserVerifyReport = browserVerify.verifyRenderedLayout();

  const reports = {
    'Architecture Sentinel': archReport,
    'Build Sentinel': buildReport,
    'UI Sentinel': uiReport,
    'Compiler Diagnostics Sentinel': compReport
  };

  // 3. Compile the entire Phase 9 Report Stack dynamically from metrics
  const reportsStack = reporter.compileReportsStack(reports, mode);

  // Inject browser results into report
  reportsStack.browserVerification = browserVerifyReport;
  if (browserVerifyReport.mismatches.length > 0) {
    reportsStack.uiGap.gapsIdentified = browserVerifyReport.mismatches;
    reportsStack.uiGap.mismatchCount = browserVerifyReport.mismatches.length;
    if (reports['UI Sentinel'].status !== 'UNAVAILABLE') {
      reports['UI Sentinel'].score = Math.max(0, reports['UI Sentinel'].score - 15);
      if (reports['UI Sentinel'].score < 80) reports['UI Sentinel'].status = 'FAIL';
    }
  }

  // 4. Persistence: Write reports stack files to disk
  const outputDir = path.join(__dirname, '../reports-stack');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, '1-architecture-report.json'), JSON.stringify(reportsStack.frameworkArchitecture, null, 2));
  fs.writeFileSync(path.join(outputDir, '2-coverage-report.json'), JSON.stringify(reportsStack.repositoryCoverage, null, 2));
  fs.writeFileSync(path.join(outputDir, '3-capability-matrix.json'), JSON.stringify(reportsStack.sentinelCapability, null, 2));
  fs.writeFileSync(path.join(outputDir, '4-rule-matrix.json'), JSON.stringify(reportsStack.ruleCoverage, null, 2));
  fs.writeFileSync(path.join(outputDir, '5-runtime-validation.json'), JSON.stringify(reportsStack.runtimeValidation, null, 2));
  fs.writeFileSync(path.join(outputDir, '6-browser-verification.json'), JSON.stringify(reportsStack.browserVerification, null, 2));
  fs.writeFileSync(path.join(outputDir, '7-ui-gap.json'), JSON.stringify(reportsStack.uiGap, null, 2));
  fs.writeFileSync(path.join(outputDir, '8-framework-health.json'), JSON.stringify(reportsStack.frameworkHealth, null, 2));
  fs.writeFileSync(path.join(outputDir, '9-release-readiness.json'), JSON.stringify(reportsStack.releaseReadiness, null, 2));

  // Write central consolidated report file
  fs.writeFileSync(path.join(__dirname, 'release-report.json'), JSON.stringify(reportsStack, null, 2));

  // Read previous execution trends from history
  const historyPath = path.join(__dirname, '../shared/history.json');
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (err) {
      // Ignored
    }
  }

  const activeIds = reportsStack.releaseReadiness.blockedIssues.map(b => b.id);
  const resolvedIssues = [];
  if (history.length > 0) {
    const lastSnap = history[history.length - 1];
    if (lastSnap.activeIssues) {
      for (const lastIssue of lastSnap.activeIssues) {
        if (!activeIds.includes(lastIssue.id)) {
          resolvedIssues.push({
            id: lastIssue.id,
            status: 'Resolved',
            resolutionTime: new Date().toISOString(),
            message: lastIssue.message,
            file: lastIssue.file
          });
        }
      }
    }
  }

  const currentTrend = {
    timestamp: new Date().toISOString(),
    overallStatus: reportsStack.releaseReadiness.status,
    totalFindings: Object.values(reports).reduce((acc, r) => acc + (r.findings ? r.findings.length : 0), 0),
    findingsBySeverity: {
      P0: Object.values(reports).reduce((acc, r) => acc + (r.findings ? r.findings.filter(f => f.severity === 'P0').length : 0), 0),
      P1: Object.values(reports).reduce((acc, r) => acc + (r.findings ? r.findings.filter(f => f.severity === 'P1').length : 0), 0),
      P2: Object.values(reports).reduce((acc, r) => acc + (r.findings ? r.findings.filter(f => f.severity === 'P2').length : 0), 0),
      P3: Object.values(reports).reduce((acc, r) => acc + (r.findings ? r.findings.filter(f => f.severity === 'P3').length : 0), 0)
    },
    sentinelScores: {
      'Architecture Sentinel': archReport.score,
      'Build Sentinel': buildReport.score,
      'UI Sentinel': uiReport.score,
      'Compiler Diagnostics Sentinel': compReport.score
    },
    activeIssues: reportsStack.releaseReadiness.blockedIssues.map(b => ({ id: b.id, message: b.message, file: b.file, severity: b.severity })),
    resolvedIssues: resolvedIssues,
    trend: resolvedIssues.length > 0 ? 'Improving' : 'Stable'
  };

  history.push(currentTrend);
  if (history.length > 10) history.shift();
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (err) {
    // Ignored
  }

  console.log('\n==================================================================');
  console.log('📊 NEXTCASEHQ RELEASE READINESS SUMMARY');
  console.log('==================================================================');
  console.log(`TIMESTAMP:        ${reportsStack.releaseReadiness.timestamp}`);
  console.log(`MODE:             ${reportsStack.releaseReadiness.mode}`);
  console.log(`STATUS:           ${reportsStack.releaseReadiness.status}`);
  console.log(`FRAMEWORK HEALTH: ${reportsStack.frameworkHealth.overallStatus}`);
  console.log(`TREND:            ${currentTrend.trend}`);
  console.log('==================================================================');

  for (const [name, h] of Object.entries(reportsStack.frameworkHealth.sentinelHealths)) {
    console.log(`- ${name}: [${h.status}] (Last success: ${h.lastRunSuccess})`);
  }
  console.log('==================================================================');

  if (resolvedIssues.length > 0) {
    console.log('🎉 RESOLVED ISSUES DETECTED:');
    resolvedIssues.forEach(issue => {
      console.log(`- [Resolved] ${issue.id}: ${issue.message} (File: ${issue.file})`);
    });
    console.log('==================================================================');
  }

  if (reportsStack.releaseReadiness.status === 'BLOCKED') {
    console.log('🛑 RELEASE IS BLOCKED BY CRITICAL CONSTITUTIONAL OR FRAMEWORK HEALTH DEFECTS:\n');
    reportsStack.releaseReadiness.blockedIssues.forEach((issue) => {
      console.log(`- [${issue.severity}] [${issue.sentinel}] ${issue.id}: ${issue.message}`);
      if (issue.file) console.log(`  File: ${issue.file}`);
      if (issue.diagnostic) {
        console.log(`  Line: ${issue.diagnostic.lineNumber || 'Unknown'}`);
        console.log(`  Root Cause: ${issue.diagnostic.rootCause}`);
        console.log(`  Remedy: ${issue.diagnostic.remedy}`);
        console.log(`  Impact: ${issue.diagnostic.impact}`);
        console.log(`  Confidence Score: ${issue.diagnostic.confidenceScore}%`);
        if (issue.diagnostic.dependencyImpact) {
          console.log(`  Production Risk: ${issue.diagnostic.dependencyImpact.productionRisk}`);
        }
      }
    });
    console.log('\n==================================================================');
    if (process.env.SENTINEL_STRICT_EXIT === 'true') {
      process.exit(1);
    }
  } else {
    console.log('🟢 CONSTITUTIONAL CRITERIA VERIFIED. RELEASE APPROVED FOR SHIPMENT.');
    console.log('==================================================================');
  }

  return reportsStack;
}

if (require.main === module) {
  run();
}

module.exports = { run };
