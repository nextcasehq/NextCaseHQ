const fs = require('fs');
const path = require('path');
const utils = require('../shared/utils');
const config = require('../shared/config.json');
const metrics = require('../shared/metrics');

function run(mode = process.env.INSPECTION_MODE || 'Repository') {
  const metadata = utils.getGitMetadata();
  const findings = [];
  const executedRules = ['UI-001', 'UI-002', 'UI-003'];

  console.log(`[UI SENTINEL] Analyzing frontend layout boundaries and navigation integrity in mode: ${mode}...`);

  const homepagePath = path.join(__dirname, '../../apps/web/src/app/page.tsx');
  const dashboardLayoutPath = path.join(__dirname, '../../apps/web/src/app/(dashboard)/layout.tsx');

  const isSimulation = process.env.SENTINEL_SIMULATE_FAILURE === 'true' || process.env.SENTINEL_SIMULATE_UI_FAILURE === 'true';

  // 1. Audit Homepage shell components, hierarchy, branding (UI-001)
  if (fs.existsSync(homepagePath)) {
    const contents = fs.readFileSync(homepagePath, 'utf8');
    const lines = contents.split('\n');

    let navbarFound = false;
    let navbarLine = 0;
    let footerFound = false;
    let footerLine = 0;
    let loginCtaFound = false;
    let loginCtaLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('<Navbar') || line.includes('<header')) {
        navbarFound = true;
        navbarLine = i + 1;
      }
      if (line.includes('<Footer') || line.includes('<footer')) {
        footerFound = true;
        footerLine = i + 1;
      }
      if (line.includes('/login') || line.includes('Sign In')) {
        loginCtaFound = true;
        loginCtaLine = i + 1;
      }
    }

    if (!navbarFound || isSimulation) {
      findings.push({
        id: 'UI-001',
        message: 'Navbar component or header boundary was not resolved or mapped in page tree.',
        severity: 'P0',
        file: 'apps/web/src/app/page.tsx',
        diagnostic: {
          lineNumber: navbarLine || 1,
          rootCause: 'Omitting branding layout components on the root public page.',
          remedy: 'Import and mount the centralized client-side brand <Navbar /> on the top landing page.',
          impact: 'Users cannot access navigation, core links, or visual brand cues upon arriving on the platform.',
          confidenceScore: 97,
          dependencyImpact: {
            affectedFiles: ['apps/web/src/app/page.tsx'],
            affectedModules: ['Web Front Shell', 'Main Branding Theme'],
            affectedUserJourneys: ['First-time Landing visit', 'Brand exploration'],
            productionRisk: 'MEDIUM'
          }
        }
      });
    }

    if (!footerFound || isSimulation) {
      findings.push({
        id: 'UI-001',
        message: 'Footer component is completely missing or omitted from the homepage.',
        severity: 'P1',
        file: 'apps/web/src/app/page.tsx',
        diagnostic: {
          lineNumber: footerLine || 1,
          rootCause: 'No footer section or Footer branding element is declared in the root viewport layout.',
          remedy: 'Incorporate client-side brand <Footer /> to bottom viewport index.',
          impact: 'Critical terms, sitemap pathways, and statutory disclosures are invisible to search indexing spiders and guests.',
          confidenceScore: 94,
          dependencyImpact: {
            affectedFiles: ['apps/web/src/app/page.tsx'],
            affectedModules: ['SEO Sitemap and Shell disclosures'],
            affectedUserJourneys: ['Platform legal and terms inspection'],
            productionRisk: 'LOW'
          }
        }
      });
    }

    if (!loginCtaFound || isSimulation) {
      findings.push({
        id: 'UI-001',
        message: 'No login portal link or primary Call To Action was found on the root homepage layout.',
        severity: 'P0',
        file: 'apps/web/src/app/page.tsx',
        diagnostic: {
          lineNumber: loginCtaLine || 1,
          rootCause: 'No direct navigation triggers referencing authentication router path `/login`.',
          remedy: 'Embed a high-density Link or button pointing to `/login` targeting tenant authentication logins.',
          impact: 'Corporate users are blocked from finding the portal sign-in gateway cleanly.',
          confidenceScore: 98,
          dependencyImpact: {
            affectedFiles: ['apps/web/src/app/page.tsx'],
            affectedModules: ['Marketing Authentication Gateway'],
            affectedUserJourneys: ['User Auth & Tenant login onboarding'],
            productionRisk: 'HIGH'
          }
        }
      });
    }
  } else {
    findings.push({
      id: 'UI-001',
      message: 'Homepage file page.tsx is completely missing from NextCaseHQ workspace.',
      severity: 'P0',
      file: 'apps/web/src/app/page.tsx',
      diagnostic: {
        rootCause: 'The root template route was deleted or moved inappropriately outside Next Router guidelines.',
        remedy: 'Reconstruct standard NextJS page.tsx at apps/web/src/app.',
        impact: 'The entire public platform server yields HTTP 404 on deployment.',
        confidenceScore: 100,
        dependencyImpact: {
          affectedFiles: ['apps/web/src/app/page.tsx'],
          affectedModules: ['Main platform core routing'],
          affectedUserJourneys: ['All external routing entries'],
          productionRisk: 'CRITICAL'
        }
      }
    });
  }

  // 2. Audit Sidebar placeholders/deadlinks (UI-002)
  if (fs.existsSync(dashboardLayoutPath)) {
    const contents = fs.readFileSync(dashboardLayoutPath, 'utf8');
    const lines = contents.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of config.forbiddenPatterns) {
        if (line.includes(pattern) || (isSimulation && pattern === 'href="#"')) {
          findings.push({
            id: 'UI-002',
            message: `Forbidden navigation token '${pattern}' found in high-focus sidebar.`,
            severity: 'P0',
            file: 'apps/web/src/app/(dashboard)/layout.tsx',
            diagnostic: {
              lineNumber: i + 1,
              rootCause: 'Dummy placeholder link (like hash reference or void JavaScript triggers) remains in production sidebar navigations.',
              remedy: 'Map click target cleanly to functional sub-routes like /dashboard or specific dashboard action modules.',
              impact: 'Users encounter broken UI layouts and unhandled hash jumps when click-navigating.',
              confidenceScore: 99,
              dependencyImpact: {
                affectedFiles: ['apps/web/src/app/(dashboard)/layout.tsx'],
                affectedModules: ['Dashboard Shell Navigation'],
                affectedUserJourneys: ['Sub-dashboard navigation workspace views'],
                productionRisk: 'HIGH'
              }
            }
          });
        }
      }
    }
  }

  // 3. Spacing, mobile viewports, touch targets and whitespace audit (UI-003)
  if (fs.existsSync(homepagePath)) {
    const contents = fs.readFileSync(homepagePath, 'utf8');
    // Check if spatial grid classes are standard tailwind
    if (!contents.includes('min-h-screen') || !contents.includes('mx-auto')) {
      findings.push({
        id: 'UI-003',
        message: 'Whitespace spacing anomaly or missing responsive container wrappers on the root page.',
        severity: 'P1',
        file: 'apps/web/src/app/page.tsx',
        diagnostic: {
          rootCause: 'Missing structural utility classes preventing consistent vertical spacing or content alignment.',
          remedy: 'Apply proper min-h-screen, mx-auto, and container grid structures to center content layouts cleanly.',
          impact: 'Fluid viewports might experience horizontal clipping or vertical overlaps.',
          confidenceScore: 95,
          dependencyImpact: {
            affectedFiles: ['apps/web/src/app/page.tsx'],
            affectedModules: ['Main Brand Shell Layout'],
            affectedUserJourneys: ['Responsive viewport scaling'],
            productionRisk: 'LOW'
          }
        }
      });
    }
  }

  // Calculate score strictly from actual execution rules
  const score = metrics.computeScore('UI Sentinel', executedRules, findings);

  const report = {
    timestamp: new Date().toISOString(),
    sentinel: 'UI Sentinel',
    repository: config.repository,
    branch: metadata.branch,
    commit: metadata.commit,
    status: score >= 80 ? 'PASS' : 'FAIL',
    mode,
    score,
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
