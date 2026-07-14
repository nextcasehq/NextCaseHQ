const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return null;
  }
}

function readJson(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    // Graceful recovery
  }
  return defaultValue;
}

function writeJson(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`[utils] Failed to write JSON to ${filePath}:`, e);
    return false;
  }
}

function scanFiles(dir, matchFn, ignoreDirs = ['node_modules', '.git', '.next', 'dist', '.turbo']) {
  const results = [];
  function recurse(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    let files;
    try {
      files = fs.readdirSync(currentDir);
    } catch (e) {
      return;
    }
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stat.isDirectory()) {
        if (!ignoreDirs.includes(file)) {
          recurse(fullPath);
        }
      } else {
        if (!matchFn || matchFn(file, fullPath)) {
          results.push(fullPath);
        }
      }
    }
  }
  recurse(dir);
  return results;
}

module.exports = {
  runCommand,
  readJson,
  writeJson,
  scanFiles
};
