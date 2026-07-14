#!/usr/bin/env node

/**
 * NextCaseHQ: Merge & Deployment Sentinel Gateway
 * Delegating to the authoritative Sentinel Framework v2.0 Release Sentinel.
 */

const path = require('path');
const { execSync } = require('child_process');

try {
  const releaseSentinelPath = path.join(__dirname, '../sentinels/release-sentinel/run.js');
  execSync(`node ${releaseSentinelPath}`, { stdio: 'inherit' });
  process.exit(0);
} catch (e) {
  process.exit(1);
}
