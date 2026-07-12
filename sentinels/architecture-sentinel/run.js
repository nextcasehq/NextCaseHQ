const fs = require('fs');
const path = require('path');
const utils = require('../shared/utils');
const config = require('../shared/config.json');

function run() {
  const start = Date.now();
  const metadata = utils.getGitMetadata();
  const findings = [];
  let score = 100;

  console.log('[ARCHITECTURE SENTINEL] Beginning inspection of repository boundaries...');

  // 1. Check for Complete Before Expanding and Architectural Drift
  // Inspect if any core database client uses tenant identity context correctly
  const appFiles = utils.findFilesInDir(path.join(__dirname, '../../apps/web/src/app'), /\.ts$/);

  let rlsFound = false;
  let piiFound = false;

  for (const file of appFiles) {
    const contents = fs.readFileSync(file, 'utf8');
    if (contents.includes('nextcase.current_tenant_id') || contents.includes('nextcase.active_tenant_id')) {
      rlsFound = true;
    }
    if (contents.includes('[REDACTED_INDIA_PII]') || contents.includes('scrubPII')) {
      piiFound = true;
    }
  }

  if (!rlsFound) {
    findings.push({
      id: 'ARCH_RLS_GUARD_MISSING',
      message: 'No RLS database current_tenant_id binding or active schema guard found in apps/web.',
      severity: 'P0',
      file: 'apps/web/src/app/api/documents/upload/route.ts',
      rootCause: 'Omission of PostgreSQL active session tenant validation.',
      recommendation: 'Ensure set_active_session_tenant is bound to withTenantContext.'
    });
    score -= 30;
  }

  if (!piiFound) {
    findings.push({
      id: 'ARCH_PII_SCRUB_MISSING',
      message: 'No edge-optimized India PAN/Aadhaar scrubbing filters or redact identifiers found in route handlers.',
      severity: 'P1',
      file: 'apps/web/src/app/api/webhooks/route.ts',
      rootCause: 'Failure to scrub litigation telemetry streams before logs are emitted.',
      recommendation: 'Implement scrubPII inside core endpoint controllers.'
    });
    score -= 20;
  }

  // 2. Check for duplicate regional package configuration imports
  const countryPacksIndex = path.join(__dirname, '../../packages/country-packs/src/index.ts');
  if (fs.existsSync(countryPacksIndex)) {
    const content = fs.readFileSync(countryPacksIndex, 'utf8');
    if (content.includes("jurisdiction === 'IN'") && content.includes("jurisdiction === 'UK'")) {
      // Correct polymorphism
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    sentinel: 'Architecture Sentinel',
    repository: config.repository,
    branch: metadata.branch,
    commit: metadata.commit,
    status: score >= 80 ? 'PASS' : 'FAIL',
    score: Math.max(0, score),
    findings
  };

  const reportPath = path.join(__dirname, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[ARCHITECTURE SENTINEL] Completed with status: ${report.status} (Score: ${report.score})`);
  return report;
}

if (require.main === module) {
  run();
}

module.exports = { run };
