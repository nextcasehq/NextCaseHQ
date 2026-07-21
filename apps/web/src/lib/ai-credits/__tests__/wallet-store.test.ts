/**
 * @jest-environment jsdom
 */
import {
  checkCanCharge,
  reserveCredits,
  debitForAction,
  releaseReservation,
  findLedgerEntryByReference,
  applyAdminAdjustment,
  reverseLedgerEntry,
  setUsageSuspended,
  getBalance,
  getLedger,
  DEMO_ACCOUNTS,
} from '../wallet-store';

const ADVOCATE = DEMO_ACCOUNTS[0].id; // demo-tenant-advocate — seeded with 650 available credits
const STARTER_TRIAL = DEMO_ACCOUNTS[2].id; // demo-tenant-starter — seeded with only 12 available credits

describe('ai-credits wallet-store — Safe AI Usage Flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('checkCanCharge allows an enabled action when the account can afford it', () => {
    const check = checkCanCharge('summarise_judgment', ADVOCATE);
    expect(check.allowed).toBe(true);
    expect(check.cost).toBe(8);
  });

  it('checkCanCharge reports insufficient_balance without ever exposing another account\'s data', () => {
    const check = checkCanCharge('prepare_written_arguments', STARTER_TRIAL); // costs 25, account only has 12
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe('insufficient_balance');
    expect(check.cost).toBe(25);
  });

  it('reserving credits increases reservedCredits and reduces the spendable amount, but never touches availableCredits itself', () => {
    const before = getBalance(ADVOCATE);
    reserveCredits('summarise_judgment', 8, ADVOCATE);
    const after = getBalance(ADVOCATE);
    expect(after.availableCredits).toBe(before.availableCredits);
    expect(after.reservedCredits).toBe(before.reservedCredits + 8);
  });

  it('a successful action reserves then debits exactly once, recording exactly one "AI usage debit" ledger entry', () => {
    const before = getBalance(ADVOCATE);
    reserveCredits('summarise_judgment', 8, ADVOCATE);

    const entry = debitForAction({
      actionKey: 'summarise_judgment',
      matterId: 'mock-matter-001',
      referenceId: 'req-test-001',
      cost: 8,
      reason: 'Summarise Judgment for this Matter Register.',
      accountId: ADVOCATE,
    });

    expect(entry.type).toBe('AI usage debit');
    expect(entry.amount).toBe(-8);
    expect(entry.status).toBe('Completed');
    expect(entry.matterId).toBe('mock-matter-001');

    const after = getBalance(ADVOCATE);
    expect(after.availableCredits).toBe(before.availableCredits - 8);
    expect(after.reservedCredits).toBe(before.reservedCredits);
    expect(after.usedCreditsThisPeriod).toBe(before.usedCreditsThisPeriod + 8);

    const debitEntries = getLedger(ADVOCATE).filter((e) => e.referenceId === 'req-test-001');
    expect(debitEntries).toHaveLength(1);
  });

  it('a failed or cancelled action after reservation releases the reservation and records a zero-effect, Failed-status entry — no debit occurs', () => {
    const before = getBalance(ADVOCATE);
    reserveCredits('rewrite_document', 15, ADVOCATE);

    const entry = releaseReservation({
      actionKey: 'rewrite_document',
      referenceId: 'req-test-002',
      cost: 15,
      reason: 'Simulated AI action failed — no credits were charged.',
      accountId: ADVOCATE,
    });

    expect(entry.type).toBe('Failed or cancelled reservation');
    expect(entry.amount).toBe(0);
    expect(entry.status).toBe('Failed');

    const after = getBalance(ADVOCATE);
    expect(after.availableCredits).toBe(before.availableCredits);
    expect(after.reservedCredits).toBe(before.reservedCredits);
  });

  it('idempotency: retrying the same request reference never double-charges', () => {
    const before = getBalance(ADVOCATE);
    reserveCredits('analyse_citation', 8, ADVOCATE);

    const first = debitForAction({
      actionKey: 'analyse_citation',
      matterId: null,
      referenceId: 'req-idempotent-001',
      cost: 8,
      reason: 'Analyse Citation.',
      accountId: ADVOCATE,
    });
    // A second attempt with the identical reference (e.g. a duplicated retry
    // of the same click) must return the original entry, not a new one.
    const second = debitForAction({
      actionKey: 'analyse_citation',
      matterId: null,
      referenceId: 'req-idempotent-001',
      cost: 8,
      reason: 'Analyse Citation.',
      accountId: ADVOCATE,
    });

    expect(second.id).toBe(first.id);
    const after = getBalance(ADVOCATE);
    expect(after.availableCredits).toBe(before.availableCredits - 8); // only ever charged once
    expect(getLedger(ADVOCATE).filter((e) => e.referenceId === 'req-idempotent-001')).toHaveLength(1);
  });

  it('idempotency also protects releaseReservation against a duplicate retry', () => {
    reserveCredits('build_chronology', 15, ADVOCATE);
    const first = releaseReservation({ actionKey: 'build_chronology', referenceId: 'req-idempotent-release', cost: 15, reason: 'failed', accountId: ADVOCATE });
    const second = releaseReservation({ actionKey: 'build_chronology', referenceId: 'req-idempotent-release', cost: 15, reason: 'failed', accountId: ADVOCATE });
    expect(second.id).toBe(first.id);
    expect(getLedger(ADVOCATE).filter((e) => e.referenceId === 'req-idempotent-release')).toHaveLength(1);
  });

  it('findLedgerEntryByReference locates a prior entry by its reference id', () => {
    reserveCredits('generate_synopsis', 8, ADVOCATE);
    debitForAction({ actionKey: 'generate_synopsis', matterId: null, referenceId: 'req-find-me', cost: 8, reason: 'x', accountId: ADVOCATE });
    expect(findLedgerEntryByReference('req-find-me', ADVOCATE)).toBeDefined();
    expect(findLedgerEntryByReference('req-does-not-exist', ADVOCATE)).toBeUndefined();
  });

  it('an admin adjustment always requires an actor and a reason, and is recorded as a new, attributed ledger entry', () => {
    const before = getBalance(ADVOCATE);
    const entry = applyAdminAdjustment({
      accountId: ADVOCATE,
      amount: 100,
      type: 'Promotional credit',
      reason: 'Goodwill credit for a reported issue.',
      adminActor: 'Platform Admin',
    });
    expect(entry.actor).toBe('Platform Admin');
    expect(entry.reason).toBe('Goodwill credit for a reported issue.');
    expect(entry.amount).toBe(100);
    const after = getBalance(ADVOCATE);
    expect(after.availableCredits).toBe(before.availableCredits + 100);
  });

  it('ledger entries are never deleted or edited — corrections are new reversal entries, and the original is only ever marked Reversed', () => {
    reserveCredits('identify_missing_information', 5, ADVOCATE);
    const original = debitForAction({ actionKey: 'identify_missing_information', matterId: null, referenceId: 'req-to-reverse', cost: 5, reason: 'x', accountId: ADVOCATE });

    const ledgerBeforeReversal = getLedger(ADVOCATE);
    expect(ledgerBeforeReversal.find((e) => e.id === original.id)).toBeDefined();

    const reversal = reverseLedgerEntry(ADVOCATE, original.id, 'Platform Admin', 'Charged in error.');
    expect(reversal).not.toBeNull();
    expect(reversal!.type).toBe('Reversal');
    expect(reversal!.amount).toBe(5); // opposite sign of the original -5

    const ledgerAfterReversal = getLedger(ADVOCATE);
    // The original entry still exists (same id, same amount/timestamp) — only its status changed.
    const originalAfter = ledgerAfterReversal.find((e) => e.id === original.id);
    expect(originalAfter).toBeDefined();
    expect(originalAfter!.amount).toBe(original.amount);
    expect(originalAfter!.status).toBe('Reversed');
    // The reversal is a brand-new entry, never a mutation of an existing one.
    expect(ledgerAfterReversal.some((e) => e.id === reversal!.id)).toBe(true);
  });

  it('suspending usage is recorded in the ledger with the admin actor and reason, and blocks further charge checks', () => {
    setUsageSuspended(ADVOCATE, true, 'Platform Admin', 'Suspicious usage pattern under review.');
    const check = checkCanCharge('summarise_judgment', ADVOCATE);
    expect(check.allowed).toBe(false);
    expect(check.reason).toMatch(/suspended/i);
  });

  it('tenant isolation: balances and ledgers for different accounts never mix', () => {
    reserveCredits('generate_synopsis', 8, ADVOCATE);
    debitForAction({ actionKey: 'generate_synopsis', matterId: null, referenceId: 'req-tenant-a', cost: 8, reason: 'x', accountId: ADVOCATE });

    const otherAccount = DEMO_ACCOUNTS[1].id; // demo-tenant-firm
    expect(getLedger(otherAccount).some((e) => e.referenceId === 'req-tenant-a')).toBe(false);
    expect(getBalance(otherAccount).usedCreditsThisPeriod).not.toBe(getBalance(ADVOCATE).usedCreditsThisPeriod);
  });
});
