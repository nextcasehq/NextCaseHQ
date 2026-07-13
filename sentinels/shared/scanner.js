const fs = require('fs');
const path = require('path');

function getCoverageStats(rootDir) {
  const stats = {
    totalFolders: 0,
    totalFiles: 0,
    supportedFileTypes: {},
    ignoredFiles: [],
    ignoredFolders: [],
    scannedFiles: 0,
    scannedFolders: 0
  };

  const ignoreList = ['node_modules', '.next', '.turbo', 'dist', 'build', '.git'];

  function traverse(dir) {
    stats.totalFolders++;
    const baseName = path.basename(dir);

    if (ignoreList.includes(baseName)) {
      stats.ignoredFolders.push(dir);
      return;
    }

    stats.scannedFolders++;
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else {
        stats.totalFiles++;
        const ext = path.extname(entry).toLowerCase() || 'no-extension';

        if (ignoreList.some(ig => fullPath.includes(path.sep + ig + path.sep))) {
          stats.ignoredFiles.push(fullPath);
        } else {
          stats.scannedFiles++;
          stats.supportedFileTypes[ext] = (stats.supportedFileTypes[ext] || 0) + 1;
        }
      }
    }
  }

  traverse(rootDir);

  // Compute coverage % (scanned files / total files)
  stats.coveragePercent = stats.totalFiles > 0
    ? parseFloat(((stats.scannedFiles / stats.totalFiles) * 100).toFixed(2))
    : 0;

  return stats;
}

module.exports = {
  getCoverageStats
};
