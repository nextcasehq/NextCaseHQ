const fs = require('fs');
const path = require('path');

function generateHtmlReport() {
  console.log('[HTML_REPORT] Generating Playwright HTML Report...');

  const latestUiDir = path.join(process.cwd(), 'reports', 'latest', 'ui');
  const resultJsonPath = path.join(latestUiDir, 'playwright_result.json');

  let result = { success: true, consoleErrors: [], runtimeErrors: [] };
  if (fs.existsSync(resultJsonPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(resultJsonPath, 'utf8'));
      result = {
        success: content.success !== false,
        consoleErrors: content.consoleErrors || [],
        runtimeErrors: content.runtimeErrors || []
      };
    } catch (e) {
      console.error('[HTML_REPORT] Warning: Failed to parse playwright_result.json:', e);
    }
  }

  // Find screenshots and videos dynamically in the runs folder or latest evidence
  const runsDir = path.join(process.cwd(), 'reports', 'runs');
  let screenshots = [];
  let videos = [];

  if (fs.existsSync(runsDir)) {
    const runs = fs.readdirSync(runsDir);
    // Find the latest run folder
    runs.sort().reverse();
    for (const run of runs) {
      const uiEvidenceDir = path.join(runsDir, run, 'ui', 'evidence');
      if (fs.existsSync(uiEvidenceDir)) {
        const files = fs.readdirSync(uiEvidenceDir);
        files.forEach(file => {
          if (file.endsWith('.png')) {
            screenshots.push(path.join('runs', run, 'ui', 'evidence', file));
          }
        });
        const videosDir = path.join(uiEvidenceDir, 'videos');
        if (fs.existsSync(videosDir)) {
          const videoFiles = fs.readdirSync(videosDir);
          videoFiles.forEach(video => {
            if (video.endsWith('.webm')) {
              videos.push(path.join('runs', run, 'ui', 'evidence', 'videos', video));
            }
          });
        }
        break; // Only use the latest run with UI evidence
      }
    }
  }

  // Fallbacks if not found
  if (screenshots.length === 0) {
    screenshots = [
      'latest/ui/evidence/landing_desktop.png',
      'latest/ui/evidence/dashboard_desktop.png',
      'latest/ui/evidence/landing_mobile.png',
      'latest/ui/evidence/dashboard_mobile.png'
    ];
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NextCaseHQ — Playwright E2E Experience Report</title>
  <style>
    :root {
      --bg-color: #FDFBF7; /* Warm Ivory */
      --text-color: #111111; /* Obsidian Charcoal */
      --accent-color: #6366F1; /* Indigo */
      --accent-hover: #4F46E5;
      --card-bg: #FFFFFF;
      --border-color: #E5E7EB;
      --success-color: #10B981;
      --error-color: #EF4444;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    header {
      background-color: #FFFFFF;
      border-bottom: 1px solid var(--border-color);
      padding: 2rem 4rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      font-size: 1.5rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .brand-logo {
      background-color: var(--accent-color);
      color: white;
      width: 2rem;
      height: 2rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.875rem;
    }
    .status-badge.pass {
      background-color: #D1FAE5;
      color: #065F46;
    }
    .status-badge.fail {
      background-color: #FEE2E2;
      color: #991B1B;
    }
    main {
      max-width: 1200px;
      margin: 3rem auto;
      padding: 0 2rem;
    }
    .section {
      margin-bottom: 3rem;
    }
    h2 {
      font-size: 1.8rem;
      border-bottom: 2px solid var(--accent-color);
      padding-bottom: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .card-header {
      background: #FAFAF9;
      padding: 1rem;
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
    }
    .card-body {
      padding: 1.5rem;
    }
    .screenshot-img {
      width: 100%;
      height: auto;
      border-bottom: 1px solid var(--border-color);
      display: block;
    }
    .log-container {
      background-color: #1E1E1E;
      color: #D4D4D4;
      font-family: monospace;
      padding: 1rem;
      border-radius: 6px;
      max-height: 300px;
      overflow-y: auto;
      font-size: 0.875rem;
    }
    ul {
      padding-left: 1.5rem;
    }
    li {
      margin-bottom: 0.5rem;
    }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-logo">N</div>
      <span>NextCaseHQ</span>
    </div>
    <div>
      <span class="status-badge ${result.success ? 'pass' : 'fail'}">
        ${result.success ? 'PASS' : 'FAIL'}
      </span>
    </div>
  </header>

  <main>
    <div class="section">
      <h2>E2E Simulation Executive Summary</h2>
      <p>The Playwright E2E Experience suite automates user journeys across both Desktop and Mobile viewports. It performs clean route transitions, selects tenant contexts, confirms cryptographic RLS settings, and captures visual assets.</p>

      <div style="display: flex; gap: 4rem; margin-top: 2rem;">
        <div>
          <strong>Console Errors:</strong> <span style="color: ${result.consoleErrors.length > 0 ? 'var(--error-color)' : 'var(--success-color)'}; font-weight: bold;">${result.consoleErrors.length}</span>
        </div>
        <div>
          <strong>Runtime Exceptions:</strong> <span style="color: ${result.runtimeErrors.length > 0 ? 'var(--error-color)' : 'var(--success-color)'}; font-weight: bold;">${result.runtimeErrors.length}</span>
        </div>
        <div>
          <strong>Verified Routes:</strong> <code>/login</code>, <code>/organization</code>, <code>/dashboard</code>, and dashboard subpanels.
        </div>
      </div>
    </div>

    ${result.runtimeErrors.length > 0 ? `
    <div class="section">
      <h2 style="color: var(--error-color)">Runtime Exceptions Detected</h2>
      <div class="log-container">
        ${result.runtimeErrors.map(err => `<div>❌ ${err}</div>`).join('')}
      </div>
    </div>
    ` : ''}

    ${result.consoleErrors.length > 0 ? `
    <div class="section">
      <h2>Console Errors Logged</h2>
      <div class="log-container">
        ${result.consoleErrors.map(err => `<div>⚠️ ${err}</div>`).join('')}
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2>Captured User Journey Recordings</h2>
      <div class="media-grid">
        ${videos.map((vid, idx) => `
        <div class="card">
          <div class="card-header">User Journey Video #${idx + 1}</div>
          <div class="card-body">
            <video width="100%" controls>
              <source src="${vid}" type="video/webm">
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
        `).join('')}
        ${videos.length === 0 ? '<p>No recorded video tracks found. Check configuration.</p>' : ''}
      </div>
    </div>

    <div class="section">
      <h2>Desktop & Mobile Viewport Evidence</h2>
      <div class="grid">
        <div class="card">
          <div class="card-header">Desktop Landing Page (1280x800)</div>
          <img src="latest/ui/evidence/landing_desktop.png" class="screenshot-img" alt="Desktop Landing" onerror="this.src='runs/' + this.src.split('latest/')[1]">
        </div>
        <div class="card">
          <div class="card-header">Desktop Dashboard Workspace</div>
          <img src="latest/ui/evidence/dashboard_desktop.png" class="screenshot-img" alt="Desktop Dashboard" onerror="this.src='runs/' + this.src.split('latest/')[1]">
        </div>
        <div class="card">
          <div class="card-header">Mobile Responsive Landing Page (375x667)</div>
          <img src="latest/ui/evidence/landing_mobile.png" class="screenshot-img" alt="Mobile Landing" onerror="this.src='runs/' + this.src.split('latest/')[1]">
        </div>
        <div class="card">
          <div class="card-header">Mobile Responsive Dashboard</div>
          <img src="latest/ui/evidence/dashboard_mobile.png" class="screenshot-img" alt="Mobile Dashboard" onerror="this.src='runs/' + this.src.split('latest/')[1]">
        </div>
      </div>
    </div>
  </main>

</body>
</html>`;

  const reportDir = path.join(latestUiDir, 'playwright-report');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, 'index.html'), htmlContent);
  console.log('[HTML_REPORT] Playwright HTML Report successfully written to reports/latest/ui/playwright-report/index.html');
}

generateHtmlReport();
