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
  // Save findings.json
  const findings = report.findings || [];
  writeJson(path.join(dir, 'findings.json'), findings);

  // Save diagnostics.json
  const diagnostics = report.diagnostics || [];
  writeJson(path.join(dir, 'diagnostics.json'), diagnostics);

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
      diagnosticsReport: path.join(dir, 'diagnostics.json')
    }
  };
  writeJson(path.join(dir, 'report.json'), mainReport);
}

module.exports = {
  createReportTemplate,
  saveSentinelReports
};
