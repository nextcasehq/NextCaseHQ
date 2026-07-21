'use client';

import {
  AI_ACTION_KEYS,
  type AiActionConfig,
  type AiActionKey,
  type Plan,
  type SystemRules,
} from './types';

export const DEMO_CONFIGURATION_NOTICE =
  'Demonstration configuration — final pricing not approved.';

const PLANS_KEY = 'nchq-ai-credits-plans-v1';
const ACTIONS_KEY = 'nchq-ai-credits-actions-v1';
const RULES_KEY = 'nchq-ai-credits-system-rules-v1';

const SEED_UPDATED_AT = '2026-07-01T09:00:00+05:30';
const SEED_UPDATED_BY = 'Product Owner (seed)';

/**
 * Seed plans — Starter / Professional / Firm. Every price, credit
 * allocation, and limit below is placeholder demonstration data, not
 * approved commercial pricing. All fields are editable from
 * Admin → Commercialization → Plans without a code change.
 */
const SEED_PLANS: Plan[] = [
  {
    id: 'plan-starter',
    code: 'STARTER',
    name: 'Starter',
    description: 'For a solo advocate getting started with AI-assisted drafting and research.',
    status: 'Active',
    billingInterval: 'Monthly',
    price: 999,
    currency: 'INR',
    includedMonthlyCredits: 200,
    rolloverPolicy: 'No rollover',
    creditExpiryPolicy: 'Expires at end of billing period',
    maxUsers: 1,
    maxActiveMatters: 25,
    featureFlags: ['Matter Registers', 'Legal Search', 'Draft Document (manual)'],
    trialAvailable: true,
    trialDurationDays: 14,
    trialCreditAllocation: 50,
    displayOrder: 1,
    isPublic: true,
    isDemoConfiguration: true,
    lastUpdatedAt: SEED_UPDATED_AT,
    updatedBy: SEED_UPDATED_BY,
  },
  {
    id: 'plan-professional',
    code: 'PROFESSIONAL',
    name: 'Professional',
    description: 'For a growing practice that relies on AI-assisted arguments, evidence review, and chronology building.',
    status: 'Active',
    billingInterval: 'Monthly',
    price: 2999,
    currency: 'INR',
    includedMonthlyCredits: 800,
    rolloverPolicy: 'Rolls over up to 1 month',
    creditExpiryPolicy: 'Expires after 90 days',
    maxUsers: 5,
    maxActiveMatters: 150,
    featureFlags: ['Matter Registers', 'Legal Search', 'eCourts Reference', 'All AI actions'],
    trialAvailable: true,
    trialDurationDays: 14,
    trialCreditAllocation: 150,
    displayOrder: 2,
    isPublic: true,
    isDemoConfiguration: true,
    lastUpdatedAt: SEED_UPDATED_AT,
    updatedBy: SEED_UPDATED_BY,
  },
  {
    id: 'plan-firm',
    code: 'FIRM',
    name: 'Firm',
    description: 'For a multi-advocate firm with shared Matter Registers and firm-level AI Credit pooling.',
    status: 'Active',
    billingInterval: 'Monthly',
    price: 8999,
    currency: 'INR',
    includedMonthlyCredits: 3000,
    rolloverPolicy: 'Rolls over indefinitely',
    creditExpiryPolicy: 'Never expires',
    maxUsers: null,
    maxActiveMatters: null,
    featureFlags: ['Matter Registers', 'Legal Search', 'eCourts Reference', 'All AI actions', 'Firm-level pooled credits'],
    trialAvailable: false,
    trialDurationDays: null,
    trialCreditAllocation: null,
    displayOrder: 3,
    isPublic: true,
    isDemoConfiguration: true,
    lastUpdatedAt: SEED_UPDATED_AT,
    updatedBy: SEED_UPDATED_BY,
  },
];

interface ActionSeed {
  key: AiActionKey;
  name: string;
  description: string;
  cost: number;
  minPlan: string | null;
  requireConfirmation: boolean;
}

const ACTION_SEEDS: ActionSeed[] = [
  { key: 'draft_document', name: 'Draft Document', description: 'Generate a first draft of a legal document from matter facts.', cost: 20, minPlan: null, requireConfirmation: true },
  { key: 'rewrite_document', name: 'Rewrite Document', description: 'Rewrite an existing document for tone, clarity, or structure.', cost: 15, minPlan: null, requireConfirmation: true },
  { key: 'improve_selected_text', name: 'Improve Selected Text', description: 'Improve a highlighted passage in place.', cost: 3, minPlan: null, requireConfirmation: false },
  { key: 'summarise_judgment', name: 'Summarise Judgment', description: 'Produce a short summary of a linked judgment.', cost: 8, minPlan: null, requireConfirmation: false },
  { key: 'analyse_citation', name: 'Analyse Citation', description: 'Assess how a saved citation applies to this matter.', cost: 8, minPlan: null, requireConfirmation: false },
  { key: 'prepare_written_arguments', name: 'Prepare Written Arguments', description: 'Draft written arguments from this Matter Register’s issues, facts, and authorities.', cost: 25, minPlan: null, requireConfirmation: true },
  { key: 'assist_evidence_review', name: 'Assist Evidence Review', description: 'Review linked evidence for contradictions and gaps.', cost: 20, minPlan: 'PROFESSIONAL', requireConfirmation: true },
  { key: 'compare_documents', name: 'Compare Documents', description: 'Compare two matter documents and highlight differences.', cost: 12, minPlan: null, requireConfirmation: true },
  { key: 'build_chronology', name: 'Build Chronology', description: 'Assemble a chronology of events from matter records.', cost: 15, minPlan: null, requireConfirmation: true },
  { key: 'suggest_legal_issues', name: 'Suggest Legal Issues', description: 'Suggest candidate legal issues for determination.', cost: 10, minPlan: null, requireConfirmation: false },
  { key: 'generate_synopsis', name: 'Generate Synopsis', description: 'Produce a short case synopsis.', cost: 8, minPlan: null, requireConfirmation: false },
  { key: 'generate_list_of_dates', name: 'Generate List of Dates', description: 'Produce a list of dates and events for this matter.', cost: 8, minPlan: null, requireConfirmation: false },
  { key: 'identify_missing_information', name: 'Identify Missing Information', description: 'Flag information gaps in this Matter Register.', cost: 5, minPlan: null, requireConfirmation: false },
];

const SEED_ACTIONS: AiActionConfig[] = ACTION_SEEDS.map((a) => ({
  actionKey: a.key,
  displayName: a.name,
  description: a.description,
  creditCost: a.cost,
  enabled: true,
  minimumPlanCode: a.minPlan,
  maxUsageLimit: null,
  allowedPlanCodes: [],
  requireConfirmationAlways: a.requireConfirmation,
  effectiveFrom: SEED_UPDATED_AT,
  adminNote: 'Seeded demonstration cost — not approved pricing.',
  isDemoConfiguration: true,
  lastUpdatedAt: SEED_UPDATED_AT,
  updatedBy: SEED_UPDATED_BY,
}));

const SEED_SYSTEM_RULES: SystemRules = {
  lowBalanceThresholds: [0.25, 0.1, 0],
  lowCostConfirmationCeiling: 5,
  defaultRequireConfirmationAlways: true,
  zeroBalanceBehavior: 'Block only the specific AI action — manual Matter Register work always remains available.',
  reservationExpiryMinutes: 10,
  maxAdminAdjustment: 1000,
  usageSuspensionAutoTrigger: false,
  trialConversionBehavior: 'Trial credits expire at trial end; no automatic charge or plan change occurs.',
  defaultCurrency: 'INR',
  taxHandlingStatus: 'Not implemented — prototype only, no tax calculation.',
  paymentStatus: 'Not implemented — prototype only, no real payment processed.',
};

function readStore<T>(key: string, seed: T): T {
  if (typeof window === 'undefined') return seed;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

function writeStore<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage unavailable — the prototype simply won't persist across reloads.
  }
}

export function getPlans(): Plan[] {
  return readStore(PLANS_KEY, SEED_PLANS);
}

export function savePlan(plan: Plan): void {
  const plans = getPlans();
  const idx = plans.findIndex((p) => p.id === plan.id);
  const updated = idx >= 0 ? [...plans.slice(0, idx), plan, ...plans.slice(idx + 1)] : [...plans, plan];
  writeStore(PLANS_KEY, updated);
}

export function getAiActions(): AiActionConfig[] {
  return readStore(ACTIONS_KEY, SEED_ACTIONS);
}

export function getAiAction(actionKey: AiActionKey): AiActionConfig | undefined {
  return getAiActions().find((a) => a.actionKey === actionKey);
}

export function saveAiAction(action: AiActionConfig): void {
  const actions = getAiActions();
  const idx = actions.findIndex((a) => a.actionKey === action.actionKey);
  const updated = idx >= 0 ? [...actions.slice(0, idx), action, ...actions.slice(idx + 1)] : [...actions, action];
  writeStore(ACTIONS_KEY, updated);
}

export function getSystemRules(): SystemRules {
  return readStore(RULES_KEY, SEED_SYSTEM_RULES);
}

export function saveSystemRules(rules: SystemRules): void {
  writeStore(RULES_KEY, rules);
}

export function resetCatalogueToSeed(): void {
  writeStore(PLANS_KEY, SEED_PLANS);
  writeStore(ACTIONS_KEY, SEED_ACTIONS);
  writeStore(RULES_KEY, SEED_SYSTEM_RULES);
}

export { AI_ACTION_KEYS };
