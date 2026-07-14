const fs = require('fs');
const path = require('path');
const { scanFiles } = require('./utils');

function scanForConflicts(rootDir) {
  const conflictFiles = [];
  const files = scanFiles(rootDir, (file, fullPath) => {
    // Only scan source/configuration files and ignore scripts/sentinels directories to avoid self-matching
    const isSourceOrConfig = file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml');
    const isSentinelOrScript = fullPath.includes('/sentinels/') || fullPath.includes('/scripts/');
    return isSourceOrConfig && !isSentinelOrScript;
  });

  const leftMarker = '<<' + '<<<<<'; // <<<<<<<
  const midMarker = '==' + '=====';   // =======
  const rightMarker = '>>' + '>>>>>'; // >>>>>>>

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(leftMarker) && content.includes(midMarker) && content.includes(rightMarker)) {
        conflictFiles.push(file);
      }
    } catch (e) {
      // Ignored
    }
  }
  return conflictFiles;
}

function scanForUIConstitution(rootDir) {
  const results = {
    checkedFiles: 0,
    colorViolations: [],
    logoChecked: false,
    logoFound: false,
    threePanelChecked: false,
    threePanelFound: false,
    navbarUsage: 0,
    footerUsage: 0
  };

  const files = scanFiles(rootDir, (file, fullPath) => {
    // Audit only web application files to prevent false alarms from design tokens or config
    const isAppFile = fullPath.includes('/apps/web/');
    return isAppFile && (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css'));
  });

  results.checkedFiles = files.length;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Look for the courthouse 'N' logo (pillars forming N or specific class/comment pattern)
      if (file.includes('page.tsx') || file.includes('Navbar.tsx') || file.includes('layout.tsx')) {
        if (content.includes('Courthouse pillars forming N') || content.includes('pillars forming N') || content.includes('stroke="currentColor" strokeWidth="2.5"')) {
          results.logoFound = true;
        }
        results.logoChecked = true;
      }

      // Look for the 3-panel workspace references
      if (content.includes('TriPaneChamber') || (content.includes('Evidence Ledger') && content.includes('AI Workspace') && content.includes('Drafting Canvas'))) {
        results.threePanelFound = true;
        results.threePanelChecked = true;
      }

      // Check occurrences of Navbar and Footer
      if (content.includes('<Navbar') && !file.includes('Navbar.tsx')) {
        results.navbarUsage++;
      }
      if (content.includes('<Footer') && !file.includes('Footer.tsx')) {
        results.footerUsage++;
      }

      // Simple heuristic color check in CSS/TSX for approved color rules if they use raw colors
      // Warm Ivory (#FDFBF7), Obsidian Charcoal (#111111)
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const hexRegex = /#([0-9a-fA-F]{3,6})/g;
        let match;
        while ((match = hexRegex.exec(content)) !== null) {
          const hex = match[0].toLowerCase();
          const allowedHexes = ['#fdfbf7', '#111111', '#ffffff', '#000000', '#4f46e5', '#4338ca', '#6366f1', '#1a1a1a', '#222222', '#333333', '#111'];
          if (hex.length === 7 && !allowedHexes.some(h => hex.startsWith(h))) {
            results.colorViolations.push({
              file: path.relative(rootDir, file),
              hex: hex,
              line: content.substring(0, match.index).split('\n').length
            });
          }
        }
      }
    } catch (e) {
      // Ignored
    }
  }

  return results;
}

module.exports = {
  scanForConflicts,
  scanForUIConstitution
};
