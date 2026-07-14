/**
 * Build Sentinel - Validates compilation, TypeScript, ESLint, tests, and dependency consistency.
 */

const fs = require('fs');
const path = require('path');
const { runCommand, scanFiles } = require('../shared/utils');
const { Logger } = require('../shared/logger');
const { createReportTemplate, saveSentinelReports } = require('../shared/reporter');

const logger = new Logger('Build Sentinel');
const startTime = Date.now();

logger.info('Starting Repository Health and Build verification...');

const report = createReportTemplate('Build Sentinel', '2.0');
report.confidence = '99%';

const findings = [];
const diagnostics = [];

// 1. Monorepo Compilation & Turbo Build Gate
logger.info('Verifying monorepo compilation status...');
const buildResult = runCommand('pnpm run build 2>&1');
const buildSuccess = (buildResult !== null);

if (!buildSuccess) {
  const issueId = 'BUILD_COMPILATION_FAILURE';
  findings.push({
    id: issueId,
    type: 'BUILD_FAILURE',
    message: 'Monorepo build contains syntax, type, or compiler errors.',
    recommendation: 'Inspect Next.js or Turborepo build logs, fix underlying syntax/import issues.'
  });

  diagnostics.push({
    id: issueId,
    name: 'Monorepo Compilation Failure',
    rootCause: `Fatal compilation or syntax errors within Next.js apps/web or workers.`,
    impact: `Prevents deployment pipeline and deployment artifact generation entirely.`,
    recommendedFix: `Resolve local compilation errors before push. Run 'pnpm run build' locally to troubleshoot.`,
    confidenceLevel: '100%'
  });
}

// 2. TypeScript Typecheck Verification
logger.info('Running TypeScript compiler validations...');
const rootTsconfig = path.join(__dirname, '../../tsconfig.json');
let typecheckSuccess = true;

if (fs.existsSync(rootTsconfig)) {
  const tscResult = runCommand('pnpm exec tsc --noEmit 2>&1');
  if (tscResult === null) {
    typecheckSuccess = false;
    const issueId = 'TYPESCRIPT_TYPECHECK_FAILURE';
    findings.push({
      id: issueId,
      type: 'TYPESCRIPT_ERROR',
      message: 'TypeScript verification found unresolved compiler errors.',
      recommendation: 'Check types, resolve null-checks, or update type interfaces.'
    });

    diagnostics.push({
      id: issueId,
      name: 'TypeScript Compiler Error',
      rootCause: `Strict type safety rule violations or mismatched interfaces.`,
      impact: `Reduces codebase reliability, hides silent runtime bugs, and blocks strict build gates.`,
      recommendedFix: `Identify specific TS issues with 'pnpm exec tsc --noEmit' and fix type declarations.`,
      confidenceLevel: '100%'
    });
  }
}

// 3. Tests Executions
logger.info('Executing unit and visual-regression tests...');
let testsSuccess = true;

// A. Web Tests (Jest)
const webTestResult = runCommand('pnpm --filter web test 2>&1');
const webTestsPassed = (webTestResult !== null);

// B. Crypto Tests (Jest)
const cryptoTestResult = runCommand('pnpm --filter @nextcase/crypto test 2>&1');
const cryptoTestsPassed = (cryptoTestResult !== null);

// C. Visual Regression Specs (Vitest)
const qaTestResult = runCommand('npx vitest run packages/qa/specs/visual-regression.spec.ts 2>&1');
const qaTestsPassed = (qaTestResult !== null && (qaTestResult.includes('passed') || qaTestResult.includes('✓')));

if (!webTestsPassed || !cryptoTestsPassed || !qaTestsPassed) {
  testsSuccess = false;
  const failedSuites = [];
  if (!webTestsPassed) failedSuites.push('web');
  if (!cryptoTestsPassed) failedSuites.push('@nextcase/crypto');
  if (!qaTestsPassed) failedSuites.push('@nextcase/qa');

  const issueId = 'TEST_SUITE_FAILURE';
  findings.push({
    id: issueId,
    type: 'TEST_FAILURE',
    message: `One or more test suites failed: ${failedSuites.join(', ')}`,
    recommendation: 'Run tests locally and address assertion failures or import/environment issues.'
  });

  diagnostics.push({
    id: issueId,
    name: 'Unit / Regression Test Failure',
    rootCause: `Failing assertions, missing mocks, or incorrect business logic handling.`,
    impact: `Indicates potential business logic regression or UI color token alignment violation.`,
    recommendedFix: `Locate the failing test files in the specified package and fix logic or test expectations.`,
    confidenceLevel: '100%'
  });
}

// 4. Dependency Invariants & Drift Verification
logger.info('Checking dependency consistency across packages...');
const rootDir = path.join(__dirname, '../../');
const packageFiles = scanFiles(rootDir, (file) => file === 'package.json');

const depRegistry = {};
const targetDeps = ['react', 'react-dom', 'next', 'typescript'];

packageFiles.forEach(file => {
  try {
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    const relative = path.relative(rootDir, file);

    const checkDeps = (depsObj) => {
      if (!depsObj) return;
      targetDeps.forEach(dep => {
        if (depsObj[dep]) {
          if (!depRegistry[dep]) depRegistry[dep] = [];
          depRegistry[dep].push({
            file: relative,
            packageName: pkg.name || 'unnamed',
            version: depsObj[dep]
          });
        }
      });
    };

    checkDeps(pkg.dependencies);
    checkDeps(pkg.devDependencies);
    checkDeps(pkg.peerDependencies);
  } catch (e) {
    // Ignored
  }
});

// Detect version drift
Object.keys(depRegistry).forEach(depName => {
  const records = depRegistry[depName];
  const versions = Array.from(new Set(records.map(r => r.version)));
  if (versions.length > 1) {
    const issueId = `DEP_DRIFT_${depName.toUpperCase().replace(/[^A-Z]/g, '_')}`;
    const desc = `Dependency drift detected for '${depName}': multiple versions used (${versions.join(', ')})`;

    findings.push({
      id: issueId,
      type: 'DEP_DRIFT',
      message: desc,
      recommendation: `Align version of '${depName}' across packages to '${versions[0]}' (or latest).`
    });

    const detailedViolations = records.map(r => `  - ${r.packageName} (${r.file}): ${r.version}`).join('\n');

    diagnostics.push({
      id: issueId,
      name: `Dependency Version Drift for ${depName}`,
      rootCause: `Package.json files in different workspace scopes declare conflicting versions for core libraries.\n${detailedViolations}`,
      impact: `Can lead to duplicate module loading, bundle bloating, and subtle runtime type mismatch behavior.`,
      recommendedFix: `Standardize version of '${depName}' inside all package.json files across the monorepo workspace.`,
      confidenceLevel: '95%'
    });
  }
});

// Calculate final status and execution metadata
const executionTimeMs = Date.now() - startTime;
report.executionTime = `${(executionTimeMs / 1000).toFixed(2)}s`;
report.status = (findings.length > 0) ? 'FAIL' : 'PASS';
report.findings = findings;
report.diagnostics = diagnostics;

// Save reports to build-sentinel folder
saveSentinelReports(__dirname, report);

logger.info(`Completed. Status: ${report.status}. Issues detected: ${findings.length}`);
if (findings.length > 0) {
  findings.forEach(f => console.log(`  [!] ${f.id}: ${f.message}`));
}
