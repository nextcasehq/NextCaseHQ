#!/usr/bin/env node
/**
 * Validates a batch of verified court data before it's added to the
 * eCourts registry, and prints a ready-to-paste TypeScript snippet for
 * the relevant config file. Never rewrites source files itself — a human
 * still pastes the result in and opens the PR, keeping every addition
 * reviewable. See docs/knowledge-base/CONTRIBUTING_COURT_DATA.md for the
 * full process and why this exists.
 *
 * Usage:
 *   node scripts/ecourts-registry/validate-court-data.js path/to/file.json
 */
const fs = require('fs');

const KNOWN_ESTABLISHMENT_TYPES = [
  'District & Sessions Court',
  'Civil Court',
  'Criminal Court',
  'Family Court',
  'Motor Accident Claims Tribunal',
  'Magistrate Court',
  'Commercial Court',
  'Consumer Commission',
  'Labour Court',
  'Revenue Court',
];

function fail(messages) {
  console.error('[validate-court-data] FAILED:\n' + messages.map((m) => `  - ${m}`).join('\n'));
  process.exit(1);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function looksLikeUrl(v) {
  return isNonEmptyString(v) && /^https?:\/\//.test(v.trim());
}

function validateDistrictCourts(data, errors) {
  if (!isNonEmptyString(data.district)) errors.push('"district" is required.');
  if (!Array.isArray(data.establishments) || data.establishments.length === 0) {
    errors.push('"establishments" must be a non-empty array.');
    return;
  }
  const seen = new Set();
  data.establishments.forEach((e, i) => {
    if (!isNonEmptyString(e.name)) errors.push(`establishments[${i}].name is required.`);
    else if (seen.has(e.name)) errors.push(`establishments[${i}].name "${e.name}" is a duplicate.`);
    else seen.add(e.name);
    if (!isNonEmptyString(e.type)) errors.push(`establishments[${i}].type is required.`);
    else if (!KNOWN_ESTABLISHMENT_TYPES.includes(e.type)) {
      errors.push(
        `establishments[${i}].type "${e.type}" is not one of the recognized types (${KNOWN_ESTABLISHMENT_TYPES.join(', ')}). ` +
          `If this is a genuinely new, real court type, add it to KNOWN_ESTABLISHMENT_TYPES in this script rather than skipping validation.`
      );
    }
  });
}

function validateHighCourtBenches(data, errors) {
  if (!isNonEmptyString(data.highCourt)) errors.push('"highCourt" is required.');
  if (!Array.isArray(data.benches) || data.benches.length === 0) {
    errors.push('"benches" must be a non-empty array.');
    return;
  }
  const seen = new Set();
  data.benches.forEach((b, i) => {
    const name = typeof b === 'string' ? b : b.name;
    if (!isNonEmptyString(name)) errors.push(`benches[${i}] is required.`);
    else if (seen.has(name)) errors.push(`benches[${i}] "${name}" is a duplicate.`);
    else seen.add(name);
  });
}

function validateConsumerDistrictCommissions(data, errors) {
  if (!isNonEmptyString(data.state)) errors.push('"state" is required.');
  if (!Array.isArray(data.districtCommissions) || data.districtCommissions.length === 0) {
    errors.push('"districtCommissions" must be a non-empty array.');
    return;
  }
  const seen = new Set();
  data.districtCommissions.forEach((c, i) => {
    const name = typeof c === 'string' ? c : c.name;
    if (!isNonEmptyString(name)) errors.push(`districtCommissions[${i}] is required.`);
    else if (seen.has(name)) errors.push(`districtCommissions[${i}] "${name}" is a duplicate.`);
    else seen.add(name);
  });
}

const VALIDATORS = {
  'district-courts': validateDistrictCourts,
  'high-courts': validateHighCourtBenches,
  'consumer-commissions': validateConsumerDistrictCommissions,
};

function printSnippet(system, data) {
  if (system === 'district-courts') {
    const entries = data.establishments
      .map((e) => `    { name: '${e.name}', type: '${e.type}' },`)
      .join('\n');
    console.log(`\nPaste into COURT_ESTABLISHMENTS_BY_DISTRICT in configs/district-courts.ts:\n`);
    console.log(`  ${data.district}: [\n${entries}\n  ],`);
  } else if (system === 'high-courts') {
    const names = data.benches.map((b) => (typeof b === 'string' ? b : b.name));
    console.log(`\nReal bench names for ${data.highCourt} (source: ${data.source}) — use these as the option list for that High Court's Bench step instead of free-text:\n`);
    console.log(JSON.stringify(names, null, 2));
  } else if (system === 'consumer-commissions') {
    const names = data.districtCommissions.map((c) => (typeof c === 'string' ? c : c.name));
    console.log(`\nReal District Commission names for ${data.state} (source: ${data.source}):\n`);
    console.log(JSON.stringify(names, null, 2));
  }
}

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/ecourts-registry/validate-court-data.js path/to/file.json');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail([`Could not read/parse ${filePath}: ${error.message}`]);
  }

  const errors = [];
  if (!isNonEmptyString(data.system) || !VALIDATORS[data.system]) {
    errors.push(`"system" must be one of: ${Object.keys(VALIDATORS).join(', ')}.`);
  }
  if (!looksLikeUrl(data.source)) {
    errors.push('"source" must be a real https:// URL an advocate could visit to verify this data themselves.');
  }
  if (!isNonEmptyString(data.verifiedDate)) {
    errors.push('"verifiedDate" (when this was checked against the source) is required.');
  }

  if (VALIDATORS[data.system]) VALIDATORS[data.system](data, errors);

  if (errors.length > 0) fail(errors);

  console.log(`[validate-court-data] PASSED — ${filePath} is well-formed and sourced.`);
  printSnippet(data.system, data);
}

main();
