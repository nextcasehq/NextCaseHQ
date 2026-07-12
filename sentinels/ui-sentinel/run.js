const fs = require('fs');
const path = require('path');
const utils = require('../shared/utils');
const config = require('../shared/config.json');

function run() {
  const metadata = utils.getGitMetadata();
  const findings = [];
  let score = 100;

  console.log('[UI SENTINEL] Analyzing frontend layout boundaries and navigation integrity...');

  const homepagePath = path.join(__dirname, '../../apps/web/src/app/page.tsx');
  const dashboardLayoutPath = path.join(__dirname, '../../apps/web/src/app/(dashboard)/layout.tsx');

  // 1. Verify Homepage exists and renders the required components
  if (fs.existsSync(homepagePath)) {
    const contents = fs.readFileSync(homepagePath, 'utf8');

    if (!contents.includes('<Navbar') && !contents.includes('<header')) {
      findings.push({
        id: 'UI_NAVBAR_MISSING',
        message: 'Navbar header is completely missing from the homepage.',
        severity: 'P0',
        file: 'apps/web/src/app/page.tsx',
        rootCause: 'No header or Navbar component declared.',
        recommendation: 'Render the brand <Navbar /> component on the root page.'
      });
      score -= 25;
    }

    if (!contents.includes('<Footer') && !contents.includes('<footer')) {
      findings.push({
        id: 'UI_FOOTER_MISSING',
        message: 'Footer element is completely missing from the homepage.',
        severity: 'P1',
        file: 'apps/web/src/app/page.tsx',
        rootCause: 'No footer or Footer component declared.',
        recommendation: 'Render the brand <Footer /> component on the root page.'
      });
      score -= 15;
    }

    // Check for CTA Buttons
    if (!contents.includes('/login') && !contents.includes('Sign In')) {
      findings.push({
        id: 'UI_CTA_SIGNIN_MISSING',
        message: 'No active login or sign-in CTA button found on the page.',
        severity: 'P0',
        file: 'apps/web/src/app/page.tsx',
        rootCause: 'Omission of primary authentication access routes.',
        recommendation: 'Create a Link targeting "/login" for sign in.'
      });
      score -= 20;
    }
  } else {
    findings.push({
      id: 'UI_HOMEPAGE_MISSING',
      message: 'Homepage page.tsx file is completely missing from NextCaseHQ workspace.',
      severity: 'P0',
      file: 'apps/web/src/app/page.tsx',
      rootCause: 'Essential index page is missing.',
      recommendation: 'Re-create page.tsx in apps/web/src/app/.'
    });
    score = 0;
  }

  // 2. Audit Dashboard Sidebar Layout for zero dead link rules
  if (fs.existsSync(dashboardLayoutPath)) {
    const contents = fs.readFileSync(dashboardLayoutPath, 'utf8');

    for (const pattern of config.forbiddenPatterns) {
      if (contents.includes(pattern)) {
        findings.push({
          id: 'UI_DEAD_LINK_VIOLATION',
          message: `Forbidden navigation token '${pattern}' found in high-focus sidebar.`,
          severity: 'P0',
          file: 'apps/web/src/app/(dashboard)/layout.tsx',
          rootCause: 'Dummy hash link or javascript:void(0) used as a placeholder in navigation.',
          recommendation: 'Map navigation click target cleanly to absolute active page indices.'
        });
        score -= 20;
      }
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    sentinel: 'UI Sentinel',
    repository: config.repository,
    branch: metadata.branch,
    commit: metadata.commit,
    status: score >= 80 ? 'PASS' : 'FAIL',
    score: Math.max(0, score),
    findings
  };

  const reportPath = path.join(__dirname, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[UI SENTINEL] Completed with status: ${report.status} (Score: ${report.score})`);
  return report;
}

if (require.main === module) {
  run();
}

module.exports = { run };
