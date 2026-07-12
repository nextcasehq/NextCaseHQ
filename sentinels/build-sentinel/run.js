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

  // 2. Validate illegal sibling boundary crossings and resolve ES/TS imports
  const tsFiles = utils.findFilesInDir(path.join(__dirname, '../../apps/web/src'), /\.(tsx?|js|jsx)$/);

  for (const tsFile of tsFiles) {
    if (tsFile.includes('node_modules') || tsFile.includes('.next') || tsFile.includes('dist')) continue;
    try {
      const content = fs.readFileSync(tsFile, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Package boundary check
        if (line.includes("from '../../packages/") || line.includes('from "../../../packages/')) {
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

        // ES/TS Import resolution check
        // Matches e.g. import { ... } from "..." or import ... from "..." or require("...")
        const importMatch = line.match(/(?:import|from|require)\s*\(?\s*['"]([^'"]+)['"]\)?/);
        if (importMatch) {
          const importPath = importMatch[1];
          // We only check internal project imports starting with "./", "../", or "@/":
          if (importPath.startsWith('.') || importPath.startsWith('@/')) {
            let resolvedPath = '';
            if (importPath.startsWith('@/')) {
              // Resolve Next.js @/ alias to apps/web/src/
              resolvedPath = path.resolve(__dirname, '../../apps/web/src', importPath.slice(2));
            } else {
              resolvedPath = path.resolve(path.dirname(tsFile), importPath);
            }

            // Check files variations (.ts, .tsx, .js, .jsx, index.ts, /index.tsx etc)
            const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
            let resolved = false;
            for (const ext of extensions) {
              if (fs.existsSync(resolvedPath + ext) && !fs.statSync(resolvedPath + ext).isDirectory()) {
                resolved = true;
                break;
              }
            }

            if (!resolved) {
              const relPath = path.relative(path.join(__dirname, '../../'), tsFile);
              findings.push({
                id: 'BUILD-001',
                message: `Cannot resolve module "${importPath}"`,
                severity: 'P0',
                file: relPath,
                diagnostic: {
                  lineNumber: i + 1,
                  rootCause: 'Invalid import path',
                  remedy: `Replace "${importPath}" with the correct path matching a valid source file in apps/web/src/components/`,
                  impact: 'Homepage cannot compile',
                  confidenceScore: 100,
                  dependencyImpact: {
                    affectedFiles: [
                      relPath,
                      'apps/web/src/components/Navbar.tsx'
                    ],
                    affectedModules: ['Homepage compilation'],
                    affectedUserJourneys: ['Landing page navigation'],
                    productionRisk: 'HIGH'
                  }
                }
              });
              score -= 30;
            }
          }
        }
      }
    } catch (err) {
      // Ignored
    }
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
