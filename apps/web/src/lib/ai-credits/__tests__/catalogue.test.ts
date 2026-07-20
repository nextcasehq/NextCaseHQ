/**
 * @jest-environment jsdom
 */
import { AI_ACTION_KEYS } from '../types';
import { getPlans, getAiActions, getSystemRules, saveAiAction, DEMO_CONFIGURATION_NOTICE } from '../catalogue';

describe('ai-credits catalogue', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('seeds exactly the 13 approved AI actions, matching AI_ACTION_KEYS', () => {
    const actions = getAiActions();
    expect(actions).toHaveLength(13);
    expect(actions.map((a) => a.actionKey).sort()).toEqual([...AI_ACTION_KEYS].sort());
  });

  it('seeds Starter/Professional/Firm plans, all marked as demonstration configuration', () => {
    const plans = getPlans();
    expect(plans.map((p) => p.code).sort()).toEqual(['FIRM', 'PROFESSIONAL', 'STARTER']);
    for (const plan of plans) {
      expect(plan.isDemoConfiguration).toBe(true);
    }
  });

  it('exposes the demonstration-configuration notice for display everywhere pricing is shown', () => {
    expect(DEMO_CONFIGURATION_NOTICE).toMatch(/demonstration configuration/i);
    expect(DEMO_CONFIGURATION_NOTICE).toMatch(/not approved/i);
  });

  it('system rules define a low-balance threshold, a low-cost confirmation ceiling, and a zero-balance behavior that never blocks the whole product', () => {
    const rules = getSystemRules();
    expect(rules.lowBalanceThresholds.length).toBeGreaterThan(0);
    expect(rules.lowCostConfirmationCeiling).toBeGreaterThan(0);
    expect(rules.zeroBalanceBehavior).toMatch(/manual/i);
  });

  it('an admin can change an action cost centrally, and every reader immediately sees the new cost (no duplicated frontend cost)', () => {
    const before = getAiActions().find((a) => a.actionKey === 'summarise_judgment')!;
    expect(before.creditCost).toBe(8);

    saveAiAction({ ...before, creditCost: 12, updatedBy: 'Platform Admin', lastUpdatedAt: new Date().toISOString() });

    const after = getAiActions().find((a) => a.actionKey === 'summarise_judgment')!;
    expect(after.creditCost).toBe(12);
  });

  it('an admin can disable an AI action centrally', () => {
    const before = getAiActions().find((a) => a.actionKey === 'compare_documents')!;
    saveAiAction({ ...before, enabled: false });
    const after = getAiActions().find((a) => a.actionKey === 'compare_documents')!;
    expect(after.enabled).toBe(false);
  });
});
