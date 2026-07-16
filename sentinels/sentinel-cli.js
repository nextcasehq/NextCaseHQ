/**
 * Sentinel CLI - Entry point for automated auditing.
 */

const fs = require('fs');
const path = require('path');

function runSentinel(name) {
  const sentinelPath = path.join(__dirname, `${name}-sentinel`, 'run.js');
  if (fs.existsSync(sentinelPath)) {
    console.log(`[SENTINEL_CLI] Running ${name}...`);
    require(sentinelPath);
  } else {
    console.error(`[SENTINEL_CLI] Sentinel ${name} not found.`);
  }
}

const args = process.argv.slice(2);
if (args.length > 0) {
  runSentinel(args[0]);
} else {
  console.log('Usage: node sentinel-cli.js <architecture|build|ui|release|bevs>');
}
