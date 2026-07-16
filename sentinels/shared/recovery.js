const logger = require('./logger');

function runWithRecovery(sentinelName, runnerFunc, mode) {
  try {
    logger.log(sentinelName, `Initiating run execution in mode: ${mode}`);

    // Safety check: verify actual runner is a function
    if (typeof runnerFunc !== 'function') {
      throw new Error(`Runner target is not an executable function.`);
    }

    const report = runnerFunc(mode);
    logger.log(sentinelName, `Execution completed successfully.`);
    return report;
  } catch (err) {
    logger.error(sentinelName, `Engine runtime crash captured. Initiating emergency recovery state...`, err);

    // Produce graceful crash recovery report
    return {
      timestamp: new Date().toISOString(),
      sentinel: sentinelName,
      status: 'UNAVAILABLE',
      score: 0,
      findings: [
        {
          id: 'SYS_RECOVERY_ENGAGED',
          message: `Sentinel ${sentinelName} failed during runtime execution. Safe mode fallback engaged.`,
          severity: 'P0',
          diagnostic: {
            rootCause: err.message,
            remedy: 'Inspect the stack trace of the sentinel runner and fix local parse or runtime errors.',
            impact: 'Quality gate scans are offline for this sentinel.',
            confidenceScore: 100
          }
        }
      ],
      error: err.message
    };
  }
}

module.exports = {
  runWithRecovery
};
