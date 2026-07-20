'use client';

import type { AiActionKey, CreditBalance, LedgerEntry, LedgerTransactionType } from './types';
import { getAiAction, getPlans } from './catalogue';

/**
 * Mock credit balance + append-only ledger, local/session persistence only
 * (see module doc comment in types.ts for why: this mirrors the shape of
 * the real TenantWallet/WalletTransactionRecord tables rather than
 * replacing them). Every function is keyed by accountId so the Admin
 * "search users or firms" experience has real, distinct accounts to find
 * rather than a single hardcoded balance — three demonstration accounts
 * are seeded below, clearly synthetic.
 */

export interface DemoAccount {
  id: string;
  name: string;
  planCode: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: 'demo-tenant-advocate', name: 'Adv. Kavita Deshmukh (Solo Practice)', planCode: 'PROFESSIONAL' },
  { id: 'demo-tenant-firm', name: 'Sharma & Associates (Firm)', planCode: 'FIRM' },
  { id: 'demo-tenant-starter', name: 'Adv. Neha Choudhary (Starter Trial)', planCode: 'STARTER' },
];

/** The account the signed-in advocate's own dashboard/credits pages
 * operate on in this prototype — there is no real multi-tenant login here. */
export const CURRENT_ACCOUNT_ID = DEMO_ACCOUNTS[0].id;

const DEMO_ACTOR = 'Adv. Kavita Deshmukh';

function balanceKey(accountId: string): string {
  return `nchq-ai-credits-balance-v1:${accountId}`;
}
function ledgerKey(accountId: string): string {
  return `nchq-ai-credits-ledger-v1:${accountId}`;
}

const SEED_BALANCES: Record<string, CreditBalance> = {
  'demo-tenant-advocate': {
    tenantId: 'demo-tenant-advocate',
    planCode: 'PROFESSIONAL',
    availableCredits: 650,
    reservedCredits: 0,
    usedCreditsThisPeriod: 150,
    promotionalCredits: 50,
    purchasedCredits: 0,
    monthlyIncludedCredits: 800,
    expiryDate: '2026-08-01T00:00:00+05:30',
    usageSuspended: false,
    lastUpdatedAt: '2026-07-18T09:00:00+05:30',
  },
  'demo-tenant-firm': {
    tenantId: 'demo-tenant-firm',
    planCode: 'FIRM',
    availableCredits: 2400,
    reservedCredits: 0,
    usedCreditsThisPeriod: 600,
    promotionalCredits: 0,
    purchasedCredits: 500,
    monthlyIncludedCredits: 3000,
    expiryDate: null,
    usageSuspended: false,
    lastUpdatedAt: '2026-07-19T09:00:00+05:30',
  },
  'demo-tenant-starter': {
    tenantId: 'demo-tenant-starter',
    planCode: 'STARTER',
    availableCredits: 12,
    reservedCredits: 0,
    usedCreditsThisPeriod: 38,
    promotionalCredits: 0,
    purchasedCredits: 0,
    monthlyIncludedCredits: 50,
    expiryDate: '2026-07-25T00:00:00+05:30',
    usageSuspended: false,
    lastUpdatedAt: '2026-07-15T09:00:00+05:30',
  },
};

const SEED_LEDGERS: Record<string, LedgerEntry[]> = {
  'demo-tenant-advocate': [
    {
      id: 'ledger-seed-001',
      tenantId: 'demo-tenant-advocate',
      userId: null,
      matterId: null,
      aiActionKey: null,
      type: 'Monthly allocation',
      amount: 800,
      balanceBefore: 0,
      balanceAfter: 800,
      status: 'Completed',
      createdAt: '2026-07-01T09:00:00+05:30',
      source: 'system',
      actor: 'system',
      referenceId: 'seed-monthly-2026-07',
      reason: 'Monthly included AI Credits for the Professional plan.',
    },
    {
      id: 'ledger-seed-002',
      tenantId: 'demo-tenant-advocate',
      userId: null,
      matterId: null,
      aiActionKey: null,
      type: 'Promotional credit',
      amount: 50,
      balanceBefore: 800,
      balanceAfter: 850,
      status: 'Completed',
      createdAt: '2026-07-02T10:00:00+05:30',
      source: 'admin',
      actor: 'Platform Admin',
      referenceId: 'seed-promo-2026-07',
      reason: 'Welcome promotional credits.',
    },
    {
      id: 'ledger-seed-003',
      tenantId: 'demo-tenant-advocate',
      userId: 'demo-tenant-advocate',
      matterId: 'mock-matter-001',
      aiActionKey: 'prepare_written_arguments',
      type: 'AI usage debit',
      amount: -25,
      balanceBefore: 850,
      balanceAfter: 825,
      status: 'Completed',
      createdAt: '2026-07-14T11:00:00+05:30',
      source: 'ai_usage',
      actor: DEMO_ACTOR,
      referenceId: 'seed-usage-2026-07-14',
      reason: 'Prepare Written Arguments for Rajeshwari Textiles v. Bansal Traders.',
    },
    {
      id: 'ledger-seed-004',
      tenantId: 'demo-tenant-advocate',
      userId: 'demo-tenant-advocate',
      matterId: null,
      aiActionKey: null,
      type: 'Manual admin adjustment',
      amount: -175,
      balanceBefore: 825,
      balanceAfter: 650,
      status: 'Completed',
      createdAt: '2026-07-18T09:00:00+05:30',
      source: 'admin',
      actor: 'Platform Admin',
      referenceId: 'seed-adjustment-2026-07-18',
      reason: 'Demonstration balance adjustment for prototype validation.',
    },
  ],
  'demo-tenant-firm': [
    {
      id: 'ledger-seed-101',
      tenantId: 'demo-tenant-firm',
      userId: null,
      matterId: null,
      aiActionKey: null,
      type: 'Monthly allocation',
      amount: 3000,
      balanceBefore: 0,
      balanceAfter: 3000,
      status: 'Completed',
      createdAt: '2026-07-01T09:00:00+05:30',
      source: 'system',
      actor: 'system',
      referenceId: 'seed-monthly-firm-2026-07',
      reason: 'Monthly included AI Credits for the Firm plan.',
    },
  ],
  'demo-tenant-starter': [
    {
      id: 'ledger-seed-201',
      tenantId: 'demo-tenant-starter',
      userId: null,
      matterId: null,
      aiActionKey: null,
      type: 'Trial allocation',
      amount: 50,
      balanceBefore: 0,
      balanceAfter: 50,
      status: 'Completed',
      createdAt: '2026-07-11T09:00:00+05:30',
      source: 'system',
      actor: 'system',
      referenceId: 'seed-trial-2026-07-11',
      reason: 'Starter plan trial credit allocation.',
    },
  ],
};

function readJson<T>(key: string, seed: T): T {
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

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage unavailable — the prototype simply won't persist across reloads.
  }
}

export function listAccounts(): DemoAccount[] {
  return DEMO_ACCOUNTS;
}

export function getBalance(accountId: string = CURRENT_ACCOUNT_ID): CreditBalance {
  return readJson(balanceKey(accountId), SEED_BALANCES[accountId] ?? SEED_BALANCES[CURRENT_ACCOUNT_ID]);
}

function writeBalance(accountId: string, balance: CreditBalance): void {
  writeJson(balanceKey(accountId), balance);
}

/** Append-only — never mutates or removes an existing entry, only ever adds a new one. */
export function getLedger(accountId: string = CURRENT_ACCOUNT_ID): LedgerEntry[] {
  return readJson(ledgerKey(accountId), SEED_LEDGERS[accountId] ?? []);
}

function appendLedgerEntry(accountId: string, entry: LedgerEntry): void {
  const ledger = getLedger(accountId);
  writeJson(ledgerKey(accountId), [entry, ...ledger]);
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PLAN_RANK: Record<string, number> = { STARTER: 1, PROFESSIONAL: 2, FIRM: 3 };

function planMeetsMinimum(accountPlanCode: string, minimumPlanCode: string): boolean {
  return (PLAN_RANK[accountPlanCode] ?? 0) >= (PLAN_RANK[minimumPlanCode] ?? 0);
}

export interface ChargeCheck {
  allowed: boolean;
  reason?: string;
  cost?: number;
  actionName?: string;
}

/** Steps 1-5 of the Safe AI Usage Flow: identify, enabled, plan, cost, balance. */
export function checkCanCharge(actionKey: AiActionKey, accountId: string = CURRENT_ACCOUNT_ID): ChargeCheck {
  const action = getAiAction(actionKey);
  if (!action) return { allowed: false, reason: 'This AI action is not configured.' };
  if (!action.enabled) return { allowed: false, reason: 'This AI action is currently disabled by an administrator.', actionName: action.displayName };
  const balance = getBalance(accountId);
  if (balance.usageSuspended) return { allowed: false, reason: 'AI Credit usage is suspended for this account.', actionName: action.displayName };
  if (action.minimumPlanCode && !planMeetsMinimum(balance.planCode, action.minimumPlanCode)) {
    const plans = getPlans();
    const minPlanName = plans.find((p) => p.code === action.minimumPlanCode)?.name ?? action.minimumPlanCode;
    return { allowed: false, reason: `This action requires the ${minPlanName} plan or higher.`, actionName: action.displayName };
  }
  const available = balance.availableCredits - balance.reservedCredits;
  if (available < action.creditCost) {
    return { allowed: false, reason: 'insufficient_balance', cost: action.creditCost, actionName: action.displayName };
  }
  return { allowed: true, cost: action.creditCost, actionName: action.displayName };
}

/** Idempotency guard — a referenceId that already produced a Completed
 * debit is never charged again; the existing entry is returned instead. */
export function findLedgerEntryByReference(referenceId: string, accountId: string = CURRENT_ACCOUNT_ID): LedgerEntry | undefined {
  return getLedger(accountId).find((e) => e.referenceId === referenceId);
}

/** Step 8: reserve. Increments reservedCredits; does not touch availableCredits. */
export function reserveCredits(actionKey: AiActionKey, cost: number, accountId: string = CURRENT_ACCOUNT_ID): void {
  const balance = getBalance(accountId);
  writeBalance(accountId, { ...balance, reservedCredits: balance.reservedCredits + cost, lastUpdatedAt: new Date().toISOString() });
}

export interface DebitParams {
  actionKey: AiActionKey;
  matterId: string | null;
  referenceId: string;
  cost: number;
  reason: string;
  accountId?: string;
}

/** Step 10: debit only after success. Moves reserved -> used, decrements
 * availableCredits, and records exactly one "AI usage debit" ledger entry. */
export function debitForAction({ actionKey, matterId, referenceId, cost, reason, accountId = CURRENT_ACCOUNT_ID }: DebitParams): LedgerEntry {
  const existing = findLedgerEntryByReference(referenceId, accountId);
  if (existing) return existing;

  const balance = getBalance(accountId);
  const balanceBefore = balance.availableCredits;
  const balanceAfter = balanceBefore - cost;
  const updated: CreditBalance = {
    ...balance,
    availableCredits: balanceAfter,
    reservedCredits: Math.max(0, balance.reservedCredits - cost),
    usedCreditsThisPeriod: balance.usedCreditsThisPeriod + cost,
    lastUpdatedAt: new Date().toISOString(),
  };
  writeBalance(accountId, updated);

  const entry: LedgerEntry = {
    id: genId('ledger'),
    tenantId: accountId,
    userId: accountId,
    matterId,
    aiActionKey: actionKey,
    type: 'AI usage debit',
    amount: -cost,
    balanceBefore,
    balanceAfter,
    status: 'Completed',
    createdAt: new Date().toISOString(),
    source: 'ai_usage',
    actor: DEMO_ACTOR,
    referenceId,
    reason,
  };
  appendLedgerEntry(accountId, entry);
  return entry;
}

export interface ReleaseParams {
  actionKey: AiActionKey;
  referenceId: string;
  cost: number;
  reason: string;
  accountId?: string;
}

/** Step 11: release the reservation on failure/cancellation. No debit
 * occurs; records a zero-effect "Failed or cancelled reservation" entry
 * so the attempt is auditable without ever charging for it. */
export function releaseReservation({ actionKey, referenceId, cost, reason, accountId = CURRENT_ACCOUNT_ID }: ReleaseParams): LedgerEntry {
  const existing = findLedgerEntryByReference(referenceId, accountId);
  if (existing) return existing;

  const balance = getBalance(accountId);
  const updated: CreditBalance = {
    ...balance,
    reservedCredits: Math.max(0, balance.reservedCredits - cost),
    lastUpdatedAt: new Date().toISOString(),
  };
  writeBalance(accountId, updated);

  const entry: LedgerEntry = {
    id: genId('ledger'),
    tenantId: accountId,
    userId: accountId,
    matterId: null,
    aiActionKey: actionKey,
    type: 'Failed or cancelled reservation',
    amount: 0,
    balanceBefore: balance.availableCredits,
    balanceAfter: balance.availableCredits,
    status: 'Failed',
    createdAt: new Date().toISOString(),
    source: 'ai_usage',
    actor: DEMO_ACTOR,
    referenceId,
    reason,
  };
  appendLedgerEntry(accountId, entry);
  return entry;
}

export interface AdminAdjustmentParams {
  accountId: string;
  amount: number;
  type: Extract<LedgerTransactionType, 'Promotional credit' | 'Manual admin adjustment' | 'Refund' | 'Expired credits'>;
  reason: string;
  adminActor: string;
}

/** Admin-only balance mutation — always requires a reason and admin
 * identity, always recorded as a new ledger entry, never edits history. */
export function applyAdminAdjustment({ accountId, amount, type, reason, adminActor }: AdminAdjustmentParams): LedgerEntry {
  const balance = getBalance(accountId);
  const balanceBefore = balance.availableCredits;
  const balanceAfter = balanceBefore + amount;
  const updated: CreditBalance = {
    ...balance,
    availableCredits: balanceAfter,
    promotionalCredits: type === 'Promotional credit' ? balance.promotionalCredits + amount : balance.promotionalCredits,
    lastUpdatedAt: new Date().toISOString(),
  };
  writeBalance(accountId, updated);

  const entry: LedgerEntry = {
    id: genId('ledger'),
    tenantId: accountId,
    userId: null,
    matterId: null,
    aiActionKey: null,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    status: 'Completed',
    createdAt: new Date().toISOString(),
    source: 'admin',
    actor: adminActor,
    referenceId: genId('admin-adj'),
    reason,
  };
  appendLedgerEntry(accountId, entry);
  return entry;
}

/** Corrections are new reversal entries — the original entry is never
 * edited or removed. */
export function reverseLedgerEntry(accountId: string, originalEntryId: string, adminActor: string, reason: string): LedgerEntry | null {
  const ledger = getLedger(accountId);
  const original = ledger.find((e) => e.id === originalEntryId);
  if (!original || original.status === 'Reversed') return null;

  const reversalAmount = -original.amount;
  const balance = getBalance(accountId);
  const balanceBefore = balance.availableCredits;
  const balanceAfter = balanceBefore + reversalAmount;
  writeBalance(accountId, { ...balance, availableCredits: balanceAfter, lastUpdatedAt: new Date().toISOString() });

  const reversal: LedgerEntry = {
    id: genId('ledger'),
    tenantId: accountId,
    userId: original.userId,
    matterId: original.matterId,
    aiActionKey: original.aiActionKey,
    type: 'Reversal',
    amount: reversalAmount,
    balanceBefore,
    balanceAfter,
    status: 'Completed',
    createdAt: new Date().toISOString(),
    source: 'admin',
    actor: adminActor,
    referenceId: genId('reversal'),
    reason: `Reversal of ${original.id}: ${reason}`,
  };
  appendLedgerEntry(accountId, reversal);

  // Mark the original as Reversed in a NEW copy of the array (append-only:
  // we still never delete it, just flip its status so it's clearly linked
  // to the reversal — the underlying row/id/amount/timestamp are untouched).
  const marked = ledger.map((e) => (e.id === originalEntryId ? { ...e, status: 'Reversed' as const } : e));
  writeJson(ledgerKey(accountId), marked);

  return reversal;
}

export function setUsageSuspended(accountId: string, suspended: boolean, adminActor: string, reason: string): void {
  const balance = getBalance(accountId);
  writeBalance(accountId, { ...balance, usageSuspended: suspended, lastUpdatedAt: new Date().toISOString() });
  appendLedgerEntry(accountId, {
    id: genId('ledger'),
    tenantId: accountId,
    userId: null,
    matterId: null,
    aiActionKey: null,
    type: 'Manual admin adjustment',
    amount: 0,
    balanceBefore: balance.availableCredits,
    balanceAfter: balance.availableCredits,
    status: 'Completed',
    createdAt: new Date().toISOString(),
    source: 'admin',
    actor: adminActor,
    referenceId: genId('suspend'),
    reason: `${suspended ? 'Suspended' : 'Restored'} AI Credit usage — ${reason}`,
  });
}
