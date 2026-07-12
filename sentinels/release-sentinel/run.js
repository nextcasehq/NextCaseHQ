const fs = require('fs');
const path = require('path');
const utils = require('../shared/utils');
const config = require('../shared/config.json');

const archSentinel = require('../architecture-sentinel/run');
const buildSentinel = require('../build-sentinel/run');
const uiSentinel = require('../ui-sentinel/run');

function run() {
  const start = Date.now();
  const metadata = utils.getGitMetadata();

  console.log('==================================================================');
  console.log('🚀 INITIALIZING NEXTCASEHQ SENITNEL GOVERNANCE ENGINE v0.1');
  console.log('==================================================================');

  // Trigger all independent Sentinels
  const archReport = archSentinel.run();
  const buildReport = buildSentinel.run();
  const uiReport = uiSentinel.run();

  const reports = {
    'Architecture Sentinel': archReport,
    'Build Sentinel': buildReport,
    'UI Sentinel': uiReport
  };

  const blockedIssues = [];
  let finalStatus = 'READY';

  // Consolidate findings
  for (const [name, r] of Object.entries(reports)) {
    for (const f of r.findings) {
      if (f.severity === 'P0' || f.severity === 'P1') {
        blockedIssues.push({
          sentinel: name,
          id: f.id,
          message: f.message,
          file: f.file,
          severity: f.severity
        });
      }
    }
  }

  if (blockedIssues.length > 0) {
    finalStatus = 'BLOCKED';
  } else if (archReport.score < 100 || buildReport.score < 100 || uiReport.score < 100) {
    finalStatus = 'READY WITH OBSERVATIONS';
  }

  const releaseReport = {
    timestamp: new Date().toISOString(),
    repository: config.repository,
    branch: metadata.branch,
    commit: metadata.commit,
    status: finalStatus,
    reports,
    blockedIssues
  };

  const reportPath = path.join(__dirname, 'release-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(releaseReport, null, 2));

  console.log('\n==================================================================');
  console.log('📊 NEXTCASEHQ RELEASE READINESS SUMMARY');
  console.log('==================================================================');
  console.log(`TIMESTAMP:   ${releaseReport.timestamp}`);
  console.log(`BRANCH:      ${releaseReport.branch}`);
  console.log(`COMMIT:      ${releaseReport.commit}`);
  console.log(`STATUS:      ${releaseReport.status}`);
  console.log('==================================================================');

  if (releaseReport.status === 'BLOCKED') {
    console.log('🛑 RELEASE IS BLOCKED BY THE FOLLOWING CRITICAL CONSTITUTIONAL DEFECTS:\n');
    releaseReport.blockedIssues.forEach((issue) => {
      console.log(`- [${issue.severity}] [${issue.sentinel}] ${issue.id}: ${issue.message}`);
      if (issue.file) console.log(`  File: ${issue.file}`);
    });
    console.log('\n==================================================================');
    process.exit(1);
  } else {
    console.log('🟢 CONSTITUTIONAL CRITERIA VERIFIED. RELEASE STABLE FOR DEPLOYMENT.');
    console.log('==================================================================');
  }

  return releaseReport;
}

if (require.main === module) {
  run();
}

module.exports = { run };
