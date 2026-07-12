const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitMetadata() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commit = execSync('git rev-parse HEAD').toString().trim();
    return { branch, commit };
  } catch (err) {
    return { branch: 'unknown', commit: 'unknown' };
  }
}

function findFilesInDir(dir, filter, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findFilesInDir(filePath, filter, fileList);
    } else if (filePath.match(filter)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function scanFileContents(filePath, regex) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.match(regex);
  } catch (err) {
    return null;
  }
}

module.exports = {
  getGitMetadata,
  findFilesInDir,
  scanFileContents
};
