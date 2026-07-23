/**
 * NextCaseHQ — Canonical TypeScript Project Graph Validator
 *
 * Verifies that all workspace packages and apps are fully accounted for,
 * compiles each project cleanly against its dedicated tsconfig, and
 * enforces zero duplicate or skipped packages.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const startTime = Date.now();

// 1. Explicit project mappings as requested
const projectMappings = {
  'apps/web': 'apps/web/tsconfig.json',
  'apps/workers': 'apps/workers/tsconfig.json',
  'packages/country-packs': 'packages/country-packs/tsconfig.json'
};

// Explicit non-TS packages
const excludedProjects = [
  'packages/ndl'
];

console.log('\n════════════════════════════════════════════════════════════════════');
console.log('                 TYPESCRIPT PROJECT GRAPH VALIDATION                 ');
console.log('════════════════════════════════════════════════════════════════════\n');

// 2. Discover all physical workspaces under apps/ and packages/
function discoverWorkspaces() {
  const workspaces = [];
  const roots = ['apps', 'packages'];

  roots.forEach(root => {
    const fullRoot = path.join(process.cwd(), root);
    if (!fs.existsSync(fullRoot)) return;

    const files = fs.readdirSync(fullRoot);
    files.forEach(file => {
      const pkgPath = path.join(fullRoot, file);
      if (fs.statSync(pkgPath).isDirectory()) {
        const pkgJson = path.join(pkgPath, 'package.json');
        if (fs.existsSync(pkgJson)) {
          workspaces.push(`${root}/${file}`);
        }
      }
    });
  });

  return workspaces;
}

const physicalWorkspaces = discoverWorkspaces();
let failed = false;
const failures = [];

// Constraint Checks:
// A. Check if any physical workspace is not referenced in either mappings or excluded list
physicalWorkspaces.forEach(workspace => {
  const isMapped = Object.keys(projectMappings).includes(workspace);
  const isExcluded = excludedProjects.includes(workspace);

  if (!isMapped && !isExcluded) {
    failed = true;
    const err = `CRITICAL FAILURE: Package '${workspace}' is active in the workspace but is skipped/not referenced in the validation graph mappings!`;
    failures.push(err);
    console.error(`🔴 ${err}`);
  }
});

// B. Check for duplicate project references in mappings
const mappedKeys = Object.keys(projectMappings);
const uniqueMappedKeys = new Set(mappedKeys);
if (mappedKeys.length !== uniqueMappedKeys.size) {
  failed = true;
  const duplicateKeys = mappedKeys.filter((item, index) => mappedKeys.indexOf(item) !== index);
  const err = `CRITICAL FAILURE: Duplicate project references detected in mappings: ${duplicateKeys.join(', ')}`;
  failures.push(err);
  console.error(`🔴 ${err}`);
}

// C. Verify all tsconfig.json files declared in mappings exist
Object.entries(projectMappings).forEach(([project, tsconfig]) => {
  const tsconfigPath = path.join(process.cwd(), tsconfig);
  if (!fs.existsSync(tsconfigPath)) {
    failed = true;
    const err = `CRITICAL FAILURE: Declare mapping for project '${project}' references missing tsconfig file: ${tsconfig}`;
    failures.push(err);
    console.error(`🔴 ${err}`);
  }
});

if (failed) {
  console.error('\n❌ VALIDATION CONSTRAINT VIOLATIONS DETECTED. ABORTING TYPE CHECK.');
  console.log('════════════════════════════════════════════════════════════════════\n');
  process.exit(1);
}

// 3. Retrieve compiler version
const tscVersionResult = spawnSync('npx', ['tsc', '--version'], { encoding: 'utf8' });
const compilerVersion = tscVersionResult.stdout ? tscVersionResult.stdout.trim() : 'Unknown';

console.log(`[TypeScript Validator] Compiler: ${compilerVersion}`);
console.log(`[TypeScript Validator] Running validation across ${mappedKeys.length} projects...\n`);

const results = [];

// 4. Validate each project sequentially using tsc --noEmit
Object.entries(projectMappings).forEach(([project, tsconfig]) => {
  console.log(`[tsc] Validating '${project}' using ${tsconfig}...`);
  const tscStart = Date.now();

  const result = spawnSync('npx', ['tsc', '-p', tsconfig, '--noEmit'], { encoding: 'utf8' });
  const duration = ((Date.now() - tscStart) / 1000).toFixed(2) + 's';

  if (result.status === 0) {
    results.push({ project, tsconfig, status: 'PASS', duration, output: '' });
  } else {
    failed = true;
    results.push({
      project,
      tsconfig,
      status: 'FAIL',
      duration,
      output: result.stdout || result.stderr || 'Compiler return code: ' + result.status
    });
  }
});

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2) + 's';

// 5. Produce a beautiful TypeScript Validation Summary
console.log('\n════════════════════════════════════════════════════════════════════');
console.log('                       TYPESCRIPT COMPILER SUMMARY                   ');
console.log('════════════════════════════════════════════════════════════════════\n');

console.log(`  Compiler Version :  ${compilerVersion}`);
console.log(`  Total Duration   :  ${totalDuration}`);
console.log(`  Verdict          :  ${failed ? '❌ FAIL' : '🟢 PASS'}\n`);

console.log('Validated Projects:');
results.forEach(r => {
  const symbol = r.status === 'PASS' ? '🟢' : '🔴';
  console.log(`  ${symbol}  ${r.project.padEnd(30)}  [${r.status}]  (${r.duration})`);
  if (r.status === 'FAIL') {
    console.log(`\n--- Compiler Errors for '${r.project}' ---\n${r.output}\n---------------------------------------\n`);
  }
});

console.log('\nExcluded Projects (Non-TypeScript / Styling assets):');
excludedProjects.forEach(proj => {
  console.log(`  ⚪  ${proj.padEnd(30)}  [EXCLUDED]`);
});

console.log('\n════════════════════════════════════════════════════════════════════\n');

if (failed) {
  process.exit(1);
} else {
  process.exit(0);
}
