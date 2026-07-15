const fs = require('fs');
const path = require('path');
const { writeJson } = require('./utils');

class SentinelLifecycle {
  constructor(sentinelName) {
    this.sentinelName = sentinelName;
    this.nameKey = this.resolveNameKey(sentinelName);
    this.state = 'Idle';

    // Multi-thread isolated execution run context
    this.runId = process.env.SENTINEL_RUN_ID || `run_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.runDir = process.env.SENTINEL_RUN_DIR || path.join(process.cwd(), 'reports', 'runs', this.runId);

    this.sentinelRunDir = path.join(this.runDir, this.nameKey);

    // Export variables so spawned child processes (like python scripts) can inherit
    process.env.SENTINEL_RUN_ID = this.runId;
    process.env.SENTINEL_RUN_DIR = this.runDir;

    this.initDirectories();
  }

  resolveNameKey(name) {
    const lower = name.toLowerCase();
    if (lower.includes('architecture')) return 'architecture';
    if (lower.includes('build')) return 'build';
    if (lower.includes('ui')) return 'ui';
    if (lower.includes('business') || lower.includes('bevs')) return 'bevs';
    if (lower.includes('release')) return 'release';
    return 'unknown';
  }

  initDirectories() {
    // 2. Store every validation run in an immutable directory structure:
    const subdirs = [
      'architecture',
      'build',
      'ui',
      'release',
      'bevs',
      'playwright',
      'screenshots',
      'logs',
      'coverage'
    ];

    subdirs.forEach(dir => {
      fs.mkdirSync(path.join(this.runDir, dir), { recursive: true });
    });
  }

  logToFile(level, msg) {
    try {
      const logLine = `[${new Date().toISOString()}] [${this.sentinelName}] [${level}]: ${msg}\n`;
      const logFile = path.join(this.runDir, 'logs', `${this.nameKey}.log`);
      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (e) {
      // Ignore log write failure
    }
  }

  transitionTo(newState) {
    const msg = `State: ${this.state} ➔ ${newState}`;
    console.log(`[SENTINEL_LIFECYCLE] [${this.sentinelName}] ${msg}`);
    this.logToFile('LIFECYCLE', msg);
    this.state = newState;
  }

  start() {
    this.transitionTo('Running');
  }

  validation() {
    this.transitionTo('Validation');
  }

  evidenceCollection() {
    this.transitionTo('Evidence Collection');
  }

  reportGeneration() {
    this.transitionTo('Report Generation');
  }

  reportPublication(reportData) {
    this.transitionTo('Report Publication');

    // Store outside repository source (strictly under RUN_DIR)
    const reportFilePath = path.join(this.sentinelRunDir, 'report.json');
    const findingsFilePath = path.join(this.sentinelRunDir, 'findings.json');
    const diagnosticsFilePath = path.join(this.sentinelRunDir, 'diagnostics.json');

    // Save findings
    const findings = reportData.findings || [];
    writeJson(findingsFilePath, findings);

    // Save diagnostics
    const diagnostics = reportData.diagnostics || [];
    writeJson(diagnosticsFilePath, diagnostics);

    // Save report
    const mainReport = {
      sentinelName: reportData.sentinelName || this.sentinelName,
      version: reportData.version || '2.0',
      executionTime: reportData.executionTime || '0s',
      status: reportData.status || 'PASS',
      confidence: reportData.confidence || '100%',
      evidence: {
        findingsCount: findings.length,
        screenshots: reportData.evidence?.screenshots || [],
        diagnosticsReport: diagnosticsFilePath
      }
    };
    writeJson(reportFilePath, mainReport);

    // Additional reports if they exist
    if (reportData.additionalReports) {
      Object.entries(reportData.additionalReports).forEach(([filename, content]) => {
        writeJson(path.join(this.sentinelRunDir, filename), content);
      });
    }
  }

  archiveEvidence() {
    this.transitionTo('Archive Runtime Evidence');
  }

  resetState() {
    this.transitionTo('Reset Sentinel State');

    // Clean up any files that were accidentally written to the repository
    const legacyPaths = [
      path.join(process.cwd(), 'sentinels', `${this.nameKey}-sentinel`, 'report.json'),
      path.join(process.cwd(), 'sentinels', `${this.nameKey}-sentinel`, 'findings.json'),
      path.join(process.cwd(), 'sentinels', `${this.nameKey}-sentinel`, 'diagnostics.json'),
      path.join(process.cwd(), 'sentinels', `${this.nameKey}-sentinel`, 'playwright_result.json'),
      path.join(process.cwd(), 'sentinels', `${this.nameKey}-sentinel`, 'ui_ux_audit_report.json')
    ];

    legacyPaths.forEach(p => {
      try {
        if (fs.existsSync(p)) {
          const relative = path.relative(process.cwd(), p);
          try {
            require('child_process').execSync(`git checkout HEAD -- "${relative}" 2>/dev/null || rm -f "${p}"`);
          } catch (e) {
            if (fs.existsSync(p)) fs.unlinkSync(p);
          }
        }
      } catch (err) {
        // Safe ignore
      }
    });

    // Also handle ui-sentinel/evidence files if any untracked files are there
    if (this.nameKey === 'ui') {
      const evidenceDir = path.join(process.cwd(), 'sentinels', 'ui-sentinel', 'evidence');
      try {
        if (fs.existsSync(evidenceDir)) {
          const files = fs.readdirSync(evidenceDir);
          files.forEach(f => {
            const full = path.join(evidenceDir, f);
            try {
              require('child_process').execSync(`git ls-files --error-unmatch "${full}"`, { stdio: 'pipe' });
            } catch (err) {
              fs.unlinkSync(full);
            }
          });
        }
      } catch (e) {}
    }

    this.transitionTo('Idle');
  }
}

module.exports = { SentinelLifecycle };
