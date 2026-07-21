'use client';

import React from 'react';
import Link from 'next/link';
import { getBalance, getLedger, CURRENT_ACCOUNT_ID } from '@/lib/ai-credits/wallet-store';
import { getPlans, getAiActions, DEMO_CONFIGURATION_NOTICE } from '@/lib/ai-credits/catalogue';
import type { CreditBalance, LedgerEntry } from '@/lib/ai-credits/types';

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDate(value: string | null): string {
  if (!value) return 'No expiry';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusPill({ status }: { status: LedgerEntry['status'] }) {
  const styles: Record<LedgerEntry['status'], string> = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Reversed: 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]',
    Failed: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function AiCreditsUsagePage() {
  const [balance, setBalance] = React.useState<CreditBalance | null>(null);
  const [ledger, setLedger] = React.useState<LedgerEntry[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    setBalance(getBalance(CURRENT_ACCOUNT_ID));
    setLedger(getLedger(CURRENT_ACCOUNT_ID));
  }, []);

  const plans = getPlans();
  const actions = getAiActions();
  const plan = balance ? plans.find((p) => p.code === balance.planCode) : undefined;

  function handleSimulatedPurchase() {
    setNotice('Prototype billing — no payment processed. Card details are never collected here.');
  }

  if (!balance) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 flex justify-center">
        <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  const available = Math.max(0, balance.availableCredits - balance.reservedCredits);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 md:py-12 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111]">AI Credits &amp; Usage</h1>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] mt-1">{DEMO_CONFIGURATION_NOTICE}</p>
      </div>

      {notice && (
        <div className="p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Balance summary — compact, not a large marketing widget */}
      <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Current Balance</p>
          <p className="text-lg font-black text-[#8A6D2F] mt-0.5">{available}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Current Plan</p>
          <p className="text-sm font-bold text-[#3A3222] mt-0.5">{plan?.name || balance.planCode}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Included This Period</p>
          <p className="text-sm font-bold text-[#3A3222] mt-0.5">{balance.monthlyIncludedCredits}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Used This Period</p>
          <p className="text-sm font-bold text-[#3A3222] mt-0.5">{balance.usedCreditsThisPeriod}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Promotional Credits</p>
          <p className="text-sm font-bold text-[#3A3222] mt-0.5">{balance.promotionalCredits}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Purchased Credits</p>
          <p className="text-sm font-bold text-[#3A3222] mt-0.5">{balance.purchasedCredits}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Renewal / Expiry</p>
          <p className="text-sm font-bold text-[#3A3222] mt-0.5">{formatDate(balance.expiryDate)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Usage Status</p>
          <p className={`text-sm font-bold mt-0.5 ${balance.usageSuspended ? 'text-red-600' : 'text-emerald-600'}`}>
            {balance.usageSuspended ? 'Suspended' : 'Active'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/pricing" className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
          View Plans
        </Link>
        <button onClick={handleSimulatedPurchase} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all">
          Buy Additional Credits
        </button>
        <button onClick={() => setNotice('Prototype billing — no payment processed. Usage statement download is a prototype action; no file is generated in this demonstration.')} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
          Download Usage Statement
        </button>
      </div>
      <p className="text-[10px] text-[#B0A588]">Prototype billing — no payment processed.</p>

      {/* Recent transactions */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Recent Transactions</h2>
        {ledger.length === 0 ? (
          <div className="text-center py-8 bg-white border border-[#E7DFC9]/80 rounded-xl">
            <p className="text-xs font-semibold text-[#8A7A56]">No AI Credit transactions recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ledger.slice(0, 15).map((entry) => (
              <div key={entry.id} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111111] truncate">{entry.type}{entry.reason ? ` — ${entry.reason}` : ''}</p>
                  <p className="text-[10px] text-[#8A7A56] mt-0.5">{formatDateTime(entry.createdAt)} · Ref: {entry.referenceId}</p>
                </div>
                <div className="flex-none flex items-center gap-2">
                  <span className={`text-xs font-black ${entry.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {entry.amount > 0 ? '+' : ''}{entry.amount}
                  </span>
                  <StatusPill status={entry.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current AI-action costs */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">AI Actions &amp; Current Costs</h2>
        <div className="bg-white border border-[#E7DFC9]/80 rounded-xl divide-y divide-[#F4EEE0]">
          {actions.map((a) => (
            <div key={a.actionKey} className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111111]">{a.displayName}</p>
                <p className="text-[10px] text-[#8A7A56] mt-0.5">{a.description}</p>
              </div>
              <div className="flex-none flex items-center gap-2">
                {!a.enabled && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F4EEE0] text-[#8A7A56] border border-[#E7DFC9]">
                    Disabled
                  </span>
                )}
                <span className="text-xs font-black text-[#8A6D2F]">{a.creditCost} AI Credits</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
