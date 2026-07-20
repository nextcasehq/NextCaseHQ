'use client';

import React from 'react';
import { DEMO_ACCOUNTS, getBalance, applyAdminAdjustment, setUsageSuspended } from '@/lib/ai-credits/wallet-store';
import type { CreditBalance } from '@/lib/ai-credits/types';
import { getPlans } from '@/lib/ai-credits/catalogue';

function AdjustmentModal({
  accountId,
  accountName,
  kind,
  onClose,
  onDone,
}: {
  accountId: string;
  accountName: string;
  kind: 'promotional' | 'adjustment';
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = React.useState(0);
  const [direction, setDirection] = React.useState<'credit' | 'debit'>('credit');
  const [reason, setReason] = React.useState('');

  const canConfirm = amount > 0 && reason.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">
          {kind === 'promotional' ? 'Add Promotional Credits' : 'Manual Adjustment'} — {accountName}
        </h3>
        <div className="flex gap-3 text-xs font-semibold">
          <label className="flex items-center gap-1.5"><input type="radio" checked={direction === 'credit'} onChange={() => setDirection('credit')} /> Credit (add)</label>
          <label className="flex items-center gap-1.5"><input type="radio" checked={direction === 'debit'} onChange={() => setDirection('debit')} /> Debit (remove)</label>
        </div>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Amount</span>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Reason (required)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Cancel</button>
          <button
            disabled={!canConfirm}
            onClick={() => {
              const signedAmount = direction === 'credit' ? amount : -amount;
              applyAdminAdjustment({
                accountId, amount: signedAmount,
                type: kind === 'promotional' ? 'Promotional credit' : 'Manual admin adjustment',
                reason, adminActor: 'Platform Admin',
              });
              onDone();
            }}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBalancesPage() {
  const [query, setQuery] = React.useState('');
  const [planFilter, setPlanFilter] = React.useState('All');
  const [refreshTick, setRefreshTick] = React.useState(0);
  const [modal, setModal] = React.useState<{ accountId: string; accountName: string; kind: 'promotional' | 'adjustment' } | null>(null);

  const plans = getPlans();

  const balances: Array<{ accountId: string; accountName: string; balance: CreditBalance }> = DEMO_ACCOUNTS.map((a) => ({
    accountId: a.id,
    accountName: a.name,
    balance: getBalance(a.id),
  }));

  const filtered = balances.filter(({ accountName, balance }) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || accountName.toLowerCase().includes(q);
    const matchesPlan = planFilter === 'All' || balance.planCode === planFilter;
    return matchesQuery && matchesPlan;
  });

  function refresh() {
    setRefreshTick((t) => t + 1);
    setModal(null);
  }

  return (
    <div className="space-y-6" key={refreshTick}>
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Credit Balances</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Search users or firms, adjust balances, and suspend/restore usage — every change is audited.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search account..." className="flex-1 min-w-[200px] px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg bg-white" />
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg bg-white">
          <option>All</option>
          {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map(({ accountId, accountName, balance }) => {
          const available = Math.max(0, balance.availableCredits - balance.reservedCredits);
          const lowBalance = balance.monthlyIncludedCredits > 0 && available / balance.monthlyIncludedCredits <= 0.25;
          return (
            <div key={accountId} className="bg-white border border-[#111111]/10 rounded-lg p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-[#111111]">{accountName}</p>
                <div className="flex items-center gap-2">
                  {lowBalance && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Low Balance</span>}
                  {balance.usageSuspended && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Usage Suspended</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                <div><p className="font-bold uppercase text-[#8A7A56]">Available</p><p className="font-semibold text-[#3A3222]">{available}</p></div>
                <div><p className="font-bold uppercase text-[#8A7A56]">Reserved</p><p className="font-semibold text-[#3A3222]">{balance.reservedCredits}</p></div>
                <div><p className="font-bold uppercase text-[#8A7A56]">Used</p><p className="font-semibold text-[#3A3222]">{balance.usedCreditsThisPeriod}</p></div>
                <div><p className="font-bold uppercase text-[#8A7A56]">Plan</p><p className="font-semibold text-[#3A3222]">{balance.planCode}</p></div>
                <div><p className="font-bold uppercase text-[#8A7A56]">Promotional</p><p className="font-semibold text-[#3A3222]">{balance.promotionalCredits}</p></div>
                <div><p className="font-bold uppercase text-[#8A7A56]">Purchased</p><p className="font-semibold text-[#3A3222]">{balance.purchasedCredits}</p></div>
                <div><p className="font-bold uppercase text-[#8A7A56]">Monthly Included</p><p className="font-semibold text-[#3A3222]">{balance.monthlyIncludedCredits}</p></div>
                <div><p className="font-bold uppercase text-[#8A7A56]">Last Updated</p><p className="font-semibold text-[#3A3222]">{new Date(balance.lastUpdatedAt).toLocaleDateString('en-IN')}</p></div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F4EEE0]">
                <button onClick={() => setModal({ accountId, accountName, kind: 'promotional' })} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Add Promotional Credits</button>
                <button onClick={() => setModal({ accountId, accountName, kind: 'adjustment' })} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Manual Adjustment</button>
                {balance.usageSuspended ? (
                  <button onClick={() => { setUsageSuspended(accountId, false, 'Platform Admin', 'Restored via Admin Panel.'); refresh(); }} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Restore Usage</button>
                ) : (
                  <button onClick={() => { setUsageSuspended(accountId, true, 'Platform Admin', 'Suspended via Admin Panel.'); refresh(); }} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-red-200 text-red-700 hover:bg-red-50 bg-white">Suspend Usage</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <AdjustmentModal
          accountId={modal.accountId}
          accountName={modal.accountName}
          kind={modal.kind}
          onClose={() => setModal(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
