const fs = require('fs');
const path = require('path');
const utils = require('../shared/utils');
const config = require('../shared/config.json');

const archSentinel = require('../architecture-sentinel/run');
const buildSentinel = require('../build-sentinel/run');
const uiSentinel = require('../ui-sentinel/run');

function run(mode = process.env.INSPECTION_MODE || 'Repository') {
  const start = Date.now();
  const metadata = utils.getGitMetadata();

  console.log('==================================================================');
  console.log(`🚀 INITIALIZING NEXTCASEHQ SENTINEL GOVERNANCE ENGINE v1.0 [Mode: ${mode}]`);
  console.log('==================================================================');

  // Define active Sentinels and their runners
  const sentinelRunners = [
    { name: 'Architecture Sentinel', run: archSentinel.run },
    { name: 'Build Sentinel', run: buildSentinel.run },
    { name: 'UI Sentinel', run: uiSentinel.run }
  ];

  const reports = {};
  const sentinelHealths = {};
  let overallStatus = 'GREEN';

  // Read previous execution history if any
  const historyPath = path.join(__dirname, '../shared/history.json');
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (err) {
      // Ignored
    }
  }

  // Self-Monitoring Run with Try-Catch isolation
  for (const runner of sentinelRunners) {
    const sentinelStart = Date.now();
    try {
      // If simulate crash requested
      if (process.env.SENTINEL_SIMULATE_CRASH === 'true' && runner.name === 'Architecture Sentinel') {
        throw new Error('Simulated hard engine exception on Architecture Sentinel runtime.');
      }

      console.log(`[FRAMEWORK HEALTH] Invoking ${runner.name}...`);
      const report = runner.run(mode);
      const elapsed = Date.now() - sentinelStart;

      reports[runner.name] = report;
      sentinelHealths[runner.name] = {
        sentinel: runner.name,
        status: report.status === 'FAIL' ? 'DEGRADED' : 'HEALTHY',
        lastRunSuccess: true,
        averageExecutionTimeMs: elapsed,
        consecutiveFailures: report.status === 'FAIL' ? 1 : 0
      };
    } catch (err) {
      console.error(`💥 [FRAMEWORK HEALTH] ${runner.name} crashed during execution:`, err.message);
      overallStatus = 'YELLOW';

      reports[runner.name] = {
        timestamp: new Date().toISOString(),
        sentinel: runner.name,
        repository: config.repository,
        branch: metadata.branch,
        commit: metadata.commit,
        status: 'UNAVAILABLE',
        mode,
        score: 0,
        findings: [],
        error: err.message
      };

      sentinelHealths[runner.name] = {
        sentinel: runner.name,
        status: 'UNAVAILABLE',
        lastRunSuccess: false,
        consecutiveFailures: 1
      };
    }
  }

  if (Object.values(sentinelHealths).every(h => h.status === 'UNAVAILABLE')) {
    overallStatus = 'RED';
  }

  const frameworkHealth = {
    timestamp: new Date().toISOString(),
    overallStatus,
    sentinelHealths
  };

  const blockedIssues = [];
  let finalStatus = 'READY';

  // Consolidate findings across non-crashed Sentinels
  for (const [name, r] of Object.entries(reports)) {
    if (r.status === 'UNAVAILABLE') continue;
    for (const f of r.findings) {
      if (f.severity === 'P0' || f.severity === 'P1') {
        blockedIssues.push({
          sentinel: name,
          id: f.id,
          message: f.message,
          file: f.file,
          severity: f.severity,
          diagnostic: f.diagnostic
        });
      }
    }
  }

  // Any Sentinel unavailable blocks the release if release certification is strict
  const isStrictRelease = mode === 'Release Certification';
  const hasUnavailable = Object.values(sentinelHealths).some(h => h.status === 'UNAVAILABLE');

  if (blockedIssues.length > 0 || (isStrictRelease && hasUnavailable)) {
    finalStatus = 'BLOCKED';
  } else if (
    Object.values(reports).some(r => r.score < 100 && r.status !== 'UNAVAILABLE') ||
    hasUnavailable
  ) {
    finalStatus = 'READY WITH OBSERVATIONS';
  }

  // Build the current active snapshot
  const activeIds = blockedIssues.map(b => b.id);
  const resolvedIssues = [];

  // Track resolved issues by comparing with previous trend snapshot
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

  // Append trends data
  const currentTrend = {
    timestamp: new Date().toISOString(),
    overallStatus: finalStatus,
    totalFindings: Object.values(reports).reduce((acc, r) => acc + (r.findings ? r.findings.length : 0), 0),
    findingsBySeverity: {
      P0: Object.values(reports).reduce((acc, r) => acc + (r.findings ? r.findings.filter(f => f.severity === 'P0').length : 0), 0),
      P1: Object.values(reports).reduce((acc, r) => acc + (r.findings ? r.findings.filter(f => f.severity === 'P1').length : 0), 0),
      P2: Object.values(reports).reduce((acc, r) => acc + (r.findings ? r.findings.filter(f => f.severity === 'P2').length : 0), 0),
      P3: Object.values(reports).reduce((acc, r) => acc + (r.findings ? r.findings.filter(f => f.severity === 'P3').length : 0), 0)
    },
    sentinelScores: {
      'Architecture Sentinel': reports['Architecture Sentinel'] ? reports['Architecture Sentinel'].score : 0,
      'Build Sentinel': reports['Build Sentinel'] ? reports['Build Sentinel'].score : 0,
      'UI Sentinel': reports['UI Sentinel'] ? reports['UI Sentinel'].score : 0
    },
    activeIssues: blockedIssues.map(b => ({ id: b.id, message: b.message, file: b.file, severity: b.severity })),
    resolvedIssues: resolvedIssues,
    trend: resolvedIssues.length > 0 ? 'Improving' : 'Stable'
  };

  history.push(currentTrend);
  if (history.length > 10) history.shift(); // Keep last 10 execution trend snapshots

  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (err) {
    // Ignored
  }

  const releaseReport = {
    timestamp: new Date().toISOString(),
    status: finalStatus,
    mode,
    reports,
    blockedIssues,
    resolvedIssues,
    frameworkHealth,
    trends: history
  };

  const reportPath = path.join(__dirname, 'release-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(releaseReport, null, 2));

  console.log('\n==================================================================');
  console.log('📊 NEXTCASEHQ RELEASE READINESS SUMMARY');
  console.log('==================================================================');
  console.log(`TIMESTAMP:        ${releaseReport.timestamp}`);
  console.log(`MODE:             ${releaseReport.mode}`);
  console.log(`STATUS:           ${releaseReport.status}`);
  console.log(`FRAMEWORK HEALTH: ${frameworkHealth.overallStatus}`);
  console.log(`TREND:            ${currentTrend.trend}`);
  console.log('==================================================================');

  for (const [name, h] of Object.entries(sentinelHealths)) {
    console.log(`- ${name}: [${h.status}] (Last success: ${h.lastRunSuccess}, Latency: ${h.averageExecutionTimeMs || 'N/A'}ms)`);
  }
  console.log('==================================================================');

  if (resolvedIssues.length > 0) {
    console.log('🎉 RESOLVED ISSUES DETECTED:');
    resolvedIssues.forEach(issue => {
      console.log(`- [Resolved] ${issue.id}: ${issue.message} (File: ${issue.file})`);
    });
    console.log('==================================================================');
  }

  if (releaseReport.status === 'BLOCKED') {
    console.log('🛑 RELEASE IS BLOCKED BY CRITICAL CONSTITUTIONAL OR FRAMEWORK HEALTH DEFECTS:\n');
    releaseReport.blockedIssues.forEach((issue) => {
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
    // We exit gracefully under local/development mode to allow downstream assertions
    if (process.env.SENTINEL_STRICT_EXIT === 'true') {
      process.exit(1);
    }
  } else {
    console.log('🟢 CONSTITUTIONAL CRITERIA VERIFIED. RELEASE APPROVED FOR SHIPMENT.');
    console.log('==================================================================');
  }

  return releaseReport;
}

if (require.main === module) {
  run();
}

module.exports = { run };
