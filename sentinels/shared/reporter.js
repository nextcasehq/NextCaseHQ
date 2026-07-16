const fs = require('fs');
const path = require('path');
const { writeJson } = require('./utils');

function createReportTemplate(sentinelName, version = '2.0') {
  return {
    sentinelName,
    version,
    executionTime: '0s',
    status: 'PASS',
    confidence: '100%',
    evidence: {
      findingsCount: 0,
      screenshots: [],
      diagnosticsReport: ''
    },
    findings: [],
    diagnostics: []
  };
}

function saveSentinelReports(dir, report) {
  // Determine if we should save to an isolated run directory
  const runId = process.env.SENTINEL_RUN_ID;
  const runDir = process.env.SENTINEL_RUN_DIR;

  let nameKey = 'unknown';
  const sentinelName = report.sentinelName || '';
  if (sentinelName.includes('Architecture')) nameKey = 'architecture';
  else if (sentinelName.includes('Build')) nameKey = 'build';
  else if (sentinelName.includes('UI')) nameKey = 'ui';
  else if (sentinelName.includes('Business') || sentinelName.includes('BEVS')) nameKey = 'bevs';
  else if (sentinelName.includes('Release')) nameKey = 'release';

  let targetDir = dir;
  if (runDir) {
    targetDir = path.join(runDir, nameKey);
  } else {
    // If running in isolation and no env is set, use a default git-ignored reports path
    const fallbackRunId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    targetDir = path.join(process.cwd(), 'reports', 'runs', fallbackRunId, nameKey);
  }

  // Ensure directories exist
  fs.mkdirSync(targetDir, { recursive: true });

  // Save findings.json
  const findings = report.findings || [];
  writeJson(path.join(targetDir, 'findings.json'), findings);

  // Save diagnostics.json
  const diagnostics = report.diagnostics || [];
  writeJson(path.join(targetDir, 'diagnostics.json'), diagnostics);

  // Save report.json
  const mainReport = {
    sentinelName: report.sentinelName,
    version: report.version,
    executionTime: report.executionTime,
    status: report.status,
    confidence: report.confidence,
    evidence: {
      findingsCount: findings.length,
      screenshots: report.evidence?.screenshots || [],
      diagnosticsReport: path.join(targetDir, 'diagnostics.json')
    }
  };
  writeJson(path.join(targetDir, 'report.json'), mainReport);

  // Also save to reports/latest/
  const latestDir = path.join(process.cwd(), 'reports', 'latest', nameKey);
  fs.mkdirSync(latestDir, { recursive: true });
  writeJson(path.join(latestDir, 'findings.json'), findings);
  writeJson(path.join(latestDir, 'diagnostics.json'), diagnostics);
  writeJson(path.join(latestDir, 'report.json'), {
    ...mainReport,
    evidence: {
      ...mainReport.evidence,
      diagnosticsReport: path.join(latestDir, 'diagnostics.json')
    }
  });
}

module.exports = {
  createReportTemplate,
  saveSentinelReports
};
