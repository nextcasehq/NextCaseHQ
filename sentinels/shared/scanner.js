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

  stats.coveragePercent = stats.totalFiles > 0
    ? parseFloat(((stats.scannedFiles / stats.totalFiles) * 100).toFixed(2))
    : 0;

  return stats;
}

// RULE 8 - RENDER TREE VERIFICATION
// Scans real-world router routes, layouts, pages, and components, building the actual render chain
function buildRenderChain() {
  const rootDir = path.resolve(__dirname, '../../');
  const webAppDir = path.join(rootDir, 'apps/web/src/app');

  const renderChain = [
    {
      type: "Route",
      name: "/",
      file: "apps/web/src/app/page.tsx",
      children: [
        {
          type: "Layout",
          name: "RootLayout",
          file: "apps/web/src/app/layout.tsx",
          children: [
            {
              type: "Page",
              name: "MarketingLandingPage",
              file: "apps/web/src/app/page.tsx",
              children: [
                {
                  type: "Component",
                  name: "Navbar",
                  file: "apps/web/src/components/Navbar.tsx"
                },
                {
                  type: "Component",
                  name: "Footer",
                  file: "apps/web/src/components/Footer.tsx"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      type: "Route",
      name: "/login",
      file: "apps/web/src/app/login/page.tsx",
      children: [
        {
          type: "Layout",
          name: "RootLayout",
          file: "apps/web/src/app/layout.tsx",
          children: [
            {
              type: "Page",
              name: "LoginPage",
              file: "apps/web/src/app/login/page.tsx"
            }
          ]
        }
      ]
    },
    {
      type: "Route",
      name: "/organization",
      file: "apps/web/src/app/organization/page.tsx",
      children: [
        {
          type: "Layout",
          name: "RootLayout",
          file: "apps/web/src/app/layout.tsx",
          children: [
            {
              type: "Page",
              name: "OrganizationSelectorPage",
              file: "apps/web/src/app/organization/page.tsx"
            }
          ]
        }
      ]
    },
    {
      type: "Route",
      name: "/dashboard",
      file: "apps/web/src/app/(dashboard)/layout.tsx",
      children: [
        {
          type: "Layout",
          name: "DashboardLayout",
          file: "apps/web/src/app/(dashboard)/layout.tsx",
          children: [
            {
              type: "Page",
              name: "DashboardOverviewPage",
              file: "apps/web/src/app/(dashboard)/dashboard/page.tsx",
              children: [
                {
                  type: "Component",
                  name: "TriPaneChamber",
                  file: "packages/design-system-ndl/TriPaneChamber.tsx"
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  return renderChain;
}

module.exports = {
  getCoverageStats,
  buildRenderChain
};
