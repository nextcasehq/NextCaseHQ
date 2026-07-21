/**
 * AI Credits commercialization domain types.
 *
 * This module is deliberately shaped to mirror the REAL, existing billing
 * tables (see db/schema.sql) rather than invent a parallel model:
 *   - CreditBalance mirrors TenantWallet (balance, currency, tenant_id) plus
 *     the additional reserved/promotional/monthly-included columns a real
 *     migration would add to that same table.
 *   - LedgerEntry mirrors WalletTransactionRecord (wallet_id, amount, type,
 *     tenant_id, created_at) plus the additional matter_id/user_id/
 *     ai_action_key/balance_before/balance_after/status/reference_id/actor/
 *     reason columns a real migration would add to that same table.
 *   - AiUsageEvent's existing-but-unused `billing_transaction_id` FK to
 *     WalletTransactionRecord is exactly the seam a real AI-usage debit
 *     would attach to (see LedgerEntry.aiActionKey + referenceId below).
 *
 * No production database, schema migration, or the real /api/wallet,
 * /api/billing/*, /api/ai/*, or lib/ai/entitlement.ts files are touched by
 * this milestone — see the PR description for why. This module is local/
 * mock persistence (see wallet-store.ts, catalogue.ts) written so a future
 * milestone can swap the storage layer for the real tables above with a
 * mechanical, not architectural, change.
 */

export const AI_ACTION_KEYS = [
  'draft_document',
  'rewrite_document',
  'improve_selected_text',
  'summarise_judgment',
  'analyse_citation',
  'prepare_written_arguments',
  'assist_evidence_review',
  'compare_documents',
  'build_chronology',
  'suggest_legal_issues',
  'generate_synopsis',
  'generate_list_of_dates',
  'identify_missing_information',
] as const;

export type AiActionKey = (typeof AI_ACTION_KEYS)[number];

export type PlanStatus = 'Draft' | 'Active' | 'Archived';
export type BillingInterval = 'Monthly' | 'Annual';
export type RolloverPolicy = 'No rollover' | 'Rolls over up to 1 month' | 'Rolls over indefinitely';
export type CreditExpiryPolicy = 'Expires at end of billing period' | 'Expires after 90 days' | 'Never expires';

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  status: PlanStatus;
  billingInterval: BillingInterval;
  price: number;
  currency: string;
  includedMonthlyCredits: number;
  rolloverPolicy: RolloverPolicy;
  creditExpiryPolicy: CreditExpiryPolicy;
  maxUsers: number | null;
  maxActiveMatters: number | null;
  featureFlags: string[];
  trialAvailable: boolean;
  trialDurationDays: number | null;
  trialCreditAllocation: number | null;
  displayOrder: number;
  isPublic: boolean;
  /** Always true for seed/demo data — this milestone ships no approved pricing. */
  isDemoConfiguration: boolean;
  lastUpdatedAt: string;
  updatedBy: string;
}

export interface AiActionConfig {
  actionKey: AiActionKey;
  displayName: string;
  description: string;
  creditCost: number;
  enabled: boolean;
  minimumPlanCode: string | null;
  maxUsageLimit: number | null;
  allowedPlanCodes: string[];
  requireConfirmationAlways: boolean;
  effectiveFrom: string | null;
  adminNote: string;
  isDemoConfiguration: boolean;
  lastUpdatedAt: string;
  updatedBy: string;
}

/** Mirrors an extended TenantWallet row — see module doc comment. */
export interface CreditBalance {
  tenantId: string;
  planCode: string;
  availableCredits: number;
  reservedCredits: number;
  usedCreditsThisPeriod: number;
  promotionalCredits: number;
  purchasedCredits: number;
  monthlyIncludedCredits: number;
  expiryDate: string | null;
  usageSuspended: boolean;
  lastUpdatedAt: string;
}

export type LedgerTransactionType =
  | 'Monthly allocation'
  | 'Trial allocation'
  | 'Credit purchase'
  | 'Promotional credit'
  | 'AI usage debit'
  | 'Refund'
  | 'Manual admin adjustment'
  | 'Expired credits'
  | 'Reversal'
  | 'Failed or cancelled reservation';

export type LedgerTransactionStatus = 'Completed' | 'Reversed' | 'Failed';

/** Mirrors an extended WalletTransactionRecord row — see module doc comment. */
export interface LedgerEntry {
  id: string;
  tenantId: string;
  userId: string | null;
  matterId: string | null;
  aiActionKey: AiActionKey | null;
  type: LedgerTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: LedgerTransactionStatus;
  createdAt: string;
  source: string;
  actor: string;
  referenceId: string;
  reason: string;
}

export const LOW_BALANCE_THRESHOLDS = [0.25, 0.1, 0] as const;

export interface SystemRules {
  lowBalanceThresholds: number[];
  lowCostConfirmationCeiling: number;
  defaultRequireConfirmationAlways: boolean;
  zeroBalanceBehavior: string;
  reservationExpiryMinutes: number;
  maxAdminAdjustment: number;
  usageSuspensionAutoTrigger: boolean;
  trialConversionBehavior: string;
  defaultCurrency: string;
  taxHandlingStatus: string;
  paymentStatus: string;
}
