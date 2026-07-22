import { enforceJudgmentResearchEntitlement } from '../entitlement';

describe('Judgment Research entitlement checkpoint', () => {
  test('always allows today — no commercial model exists yet to deny against', async () => {
    const result = await enforceJudgmentResearchEntitlement('any-tenant', 'any-user');
    expect(result.allowed).toBe(true);
  });

  test('is the single choke point every call passes through — used by the orchestration service', () => {
    const serviceSource = require('fs').readFileSync(
      require('path').join(__dirname, '../judgment-research-service.ts'),
      'utf8'
    );
    expect(serviceSource).toContain('enforceJudgmentResearchEntitlement');
  });
});
