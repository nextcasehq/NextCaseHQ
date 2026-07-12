const fs = require('fs');
const path = require('path');
const utils = require('../shared/utils');
const config = require('../shared/config.json');

function run(mode = process.env.INSPECTION_MODE || 'Repository') {
  const metadata = utils.getGitMetadata();
  const findings = [];
  let score = 100;

  console.log(`[BUILD SENTINEL] Scanning build configurations and package boundary constraints in mode: ${mode}...`);

  // 1. Verify TypeScript setups across workspace packages
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
        diagnostic: {
          rootCause: `Package directories do not contain a standalone tsconfig.json extending the base monorepo standard config.`,
          remedy: `Create tsconfig.json and extend "@nextcase/config/tsconfig.base.json".`,
          impact: 'Module type-checking and absolute imports resolution will fail in workspace scopes.',
          confidenceScore: 100,
          dependencyImpact: {
            affectedFiles: [tsPath],
            affectedModules: [tsPath.split('/')[0]],
            affectedUserJourneys: ['Local development build checks', 'CI integration pipeline validation'],
            productionRisk: 'LOW'
          }
        }
      });
      score -= 15;
    }
  }

  // 2. Validate illegal sibling boundary crossings (must not bypass monorepo packages mappings)
  const isSimulation = process.env.SENTINEL_SIMULATE_FAILURE === 'true' || process.env.SENTINEL_SIMULATE_BUILD_FAILURE === 'true';

  const tsFiles = utils.findFilesInDir(path.join(__dirname, '../../apps/web/src'), /\.tsx?$/);
  let violationFound = false;

  for (const tsFile of tsFiles) {
    if (tsFile.includes('node_modules') || tsFile.includes('.next') || tsFile.includes('dist')) continue;
    try {
      const content = fs.readFileSync(tsFile, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("from '../../packages/") || line.includes('from "../../../packages/')) {
          violationFound = true;
          findings.push({
            id: 'BUILD_BOUNDARY_VIOLATION',
            message: 'Illegal sibling package path boundary crossing detected.',
            severity: 'P0',
            file: path.relative(path.join(__dirname, '../../'), tsFile),
            diagnostic: {
              lineNumber: i + 1,
              rootCause: 'Manual import using parent directory traversal bypasses Turborepo task orchestrations and bundler packaging limits.',
              remedy: 'Replace relative package imports with their workspace exports schema, e.g., "@nextcase/crypto".',
              impact: 'Changes made in package exports do not trigger standard turborepo rebuilds of web app bundles.',
              confidenceScore: 99,
              dependencyImpact: {
                affectedFiles: [path.relative(path.join(__dirname, '../../'), tsFile)],
                affectedModules: ['Web Server compilation', 'Monorepo Bundler pipeline'],
                affectedUserJourneys: ['All user journeys reliant on packages updates'],
                productionRisk: 'HIGH'
              }
            }
          });
          score -= 25;
        }
      }
    } catch (err) {
      // Ignored
    }
  }

  if (isSimulation && !violationFound) {
    findings.push({
      id: 'BUILD_BOUNDARY_VIOLATION',
      message: 'Illegal sibling package path boundary crossing detected.',
      severity: 'P0',
      file: 'apps/web/src/app/page.tsx',
      diagnostic: {
        lineNumber: 12,
        rootCause: 'Manual relative imports of sibling workspace directories instead of workspace resolution alias.',
        remedy: 'Replace relative package imports with their workspace exports schema, e.g., "@nextcase/crypto".',
        impact: 'Changes made in package exports do not trigger standard turborepo rebuilds of web app bundles.',
        confidenceScore: 99,
        dependencyImpact: {
          affectedFiles: ['apps/web/src/app/page.tsx'],
          affectedModules: ['Web Server compilation'],
          affectedUserJourneys: ['Landing page navigation'],
          productionRisk: 'HIGH'
        }
      }
    });
    score -= 25;
  }

  const report = {
    timestamp: new Date().toISOString(),
    sentinel: 'Build Sentinel',
    repository: config.repository,
    branch: metadata.branch,
    commit: metadata.commit,
    status: score >= 80 ? 'PASS' : 'FAIL',
    mode,
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
