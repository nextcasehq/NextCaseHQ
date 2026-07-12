const fs = require('fs');
const path = require('path');
const utils = require('../shared/utils');
const config = require('../shared/config.json');

function run() {
  const metadata = utils.getGitMetadata();
  const findings = [];
  let score = 100;

  console.log('[BUILD SENTINEL] Scanning build configurations, TypeScript setups, and imports...');

  // 1. Check for TS Config setups across monorepo packages
  const tsConfigPaths = [
    'apps/web/tsconfig.json',
    'apps/workers/tsconfig.json',
    'packages/crypto/tsconfig.json'
  ];

  for (const tsPath of tsConfigPaths) {
    const fullPath = path.join(__dirname, '../../', tsPath);
    if (!fs.existsSync(fullPath)) {
      findings.push({
        id: 'BUILD_TSCONFIG_MISSING',
        message: `TypeScript configuration file ${tsPath} is missing in workspace package.`,
        severity: 'P1',
        file: tsPath,
        rootCause: 'TSConfig omitted or corrupted.',
        recommendation: 'Ensure @nextcase/config is extended in tsconfig.json.'
      });
      score -= 15;
    }
  }

  // 2. Validate imports/exports package boundaries (no relative imports across monorepo packages)
  const tsFiles = utils.findFilesInDir(path.join(__dirname, '../../apps/web/src'), /\.tsx?$/);
  for (const tsFile of tsFiles) {
    const content = fs.readFileSync(tsFile, 'utf8');
    if (content.includes("from '../../packages/") || content.includes('from "../../../packages/')) {
      findings.push({
        id: 'BUILD_BOUNDARY_VIOLATION',
        message: 'Illegal package boundary crossing. Monorepo packages must be imported via workspace exports instead of relative paths.',
        severity: 'P0',
        file: path.relative(path.join(__dirname, '../../'), tsFile),
        rootCause: 'Manual relative import of isolated sibling packages.',
        recommendation: "Import through @nextcase/ relative path mappings."
      });
      score -= 25;
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    sentinel: 'Build Sentinel',
    repository: config.repository,
    branch: metadata.branch,
    commit: metadata.commit,
    status: score >= 80 ? 'PASS' : 'FAIL',
    score: Math.max(0, score),
    findings
  };

  const reportPath = path.join(__dirname, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[BUILD SENTINEL] Completed with status: ${report.status} (Score: ${report.score})`);
  return report;
}

if (require.main === module) {
  run();
}

module.exports = { run };
