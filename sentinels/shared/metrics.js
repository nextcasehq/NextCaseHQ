const fs = require('fs');
const path = require('path');

// Evaluates executed rules vs total registered rules for a sentinel, calculating the score directly
function computeScore(sentinelName, executedRules, activeFindings) {
  // Read all registered rules for this sentinel
  const registryPath = path.join(__dirname, '../registry.json');
  let registeredRules = [];
  try {
    const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    registeredRules = reg.rules.filter(r => r.sentinel === sentinelName && r.status === 'Active');
  } catch (err) {
    // Fallback if registry fails to read
  }

  if (registeredRules.length === 0) return 0;

  // Track which active rules were actually executed and passed
  let executedAndPassed = 0;
  for (const rule of registeredRules) {
    const isExecuted = executedRules.includes(rule.id);
    const hasFinding = activeFindings.some(f => f.id === rule.id);
    if (isExecuted && !hasFinding) {
      executedAndPassed++;
    }
  }

  // Baseline score is computed solely from: (rules passed / total registered active rules) * 100
  const score = Math.round((executedAndPassed / registeredRules.length) * 100);
  return score;
}

module.exports = {
  computeScore
};
