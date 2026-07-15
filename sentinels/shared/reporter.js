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
  const category = path.basename(dir);
  const rootDir = path.join(__dirname, '../../');
  const targetDir = path.join(rootDir, 'reports', category);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

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
}

module.exports = {
  createReportTemplate,
  saveSentinelReports
};
