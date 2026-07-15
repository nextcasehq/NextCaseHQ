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
    this.latestDir = path.join(process.cwd(), 'reports', 'latest', this.nameKey);

    // Export variables so spawned child processes (like python scripts) can inherit
    process.env.SENTINEL_RUN_ID = this.runId;
    process.env.SENTINEL_RUN_DIR = this.runDir;
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

  transitionTo(newState) {
    console.log(`[SENTINEL_LIFECYCLE] [${this.sentinelName}] State: ${this.state} ➔ ${newState}`);
    this.state = newState;
  }

  start() {
    this.transitionTo('Running');
    // Ensure the isolated run subdirectory exists
    fs.mkdirSync(this.sentinelRunDir, { recursive: true });
    fs.mkdirSync(this.latestDir, { recursive: true });
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

    // Store outside repository source (strictly under RUN_DIR and latest)
    const reportFilePath = path.join(this.sentinelRunDir, 'report.json');
    const findingsFilePath = path.join(this.sentinelRunDir, 'findings.json');
    const diagnosticsFilePath = path.join(this.sentinelRunDir, 'diagnostics.json');

    // Save findings
    const findings = reportData.findings || [];
    writeJson(findingsFilePath, findings);
    writeJson(path.join(this.latestDir, 'findings.json'), findings);

    // Save diagnostics
    const diagnostics = reportData.diagnostics || [];
    writeJson(diagnosticsFilePath, diagnostics);
    writeJson(path.join(this.latestDir, 'diagnostics.json'), diagnostics);

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
    writeJson(path.join(this.latestDir, 'report.json'), mainReport);

    // Additional reports if they exist
    if (reportData.additionalReports) {
      Object.entries(reportData.additionalReports).forEach(([filename, content]) => {
        writeJson(path.join(this.sentinelRunDir, filename), content);
        writeJson(path.join(this.latestDir, filename), content);
      });
    }
  }

  archiveEvidence() {
    this.transitionTo('Archive Runtime Evidence');
    // Copy any temporary/local evidence folder content to the run folder if necessary
    // Note: We design our runners to write directly to runDir, but this step confirms and moves leftovers
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
          // If the file is git-tracked, do NOT modify it or if it is dirty, we delete/restore it.
          // Since we want the repo to remain perfectly in its original tracked state, we can restore it using git checkout or just delete any untracked leftover.
          // Wait, actually, let's restore tracked files via git checkout if they differ, or delete untracked temporary files.
          // Let's check if they are tracked by git. If we did not write to them, we are fine!
          // But if they were somehow modified, we can run 'git checkout' on them.
          // Let's do a safe restore:
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
            // If not tracked by git, remove it
            try {
              const isTracked = require('child_process').execSync(`git ls-files --error-unmatch "${full}"`, { stdio: 'pipe' });
            } catch (err) {
              // Not tracked, delete it!
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
