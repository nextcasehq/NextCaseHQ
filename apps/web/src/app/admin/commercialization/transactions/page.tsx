'use client';

import React from 'react';
import { DEMO_ACCOUNTS, getLedger, reverseLedgerEntry } from '@/lib/ai-credits/wallet-store';
import type { LedgerEntry } from '@/lib/ai-credits/types';

function ReasonModal({ onConfirm, onCancel }: { onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = React.useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">Reverse Transaction</h3>
        <p className="text-xs text-[#8A7A56]">This creates a new reversal entry — the original transaction is never edited or deleted.</p>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason (required)" className="w-full px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Cancel</button>
          <button disabled={!reason.trim()} onClick={() => onConfirm(reason)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">Confirm Reversal</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTransactionsPage() {
  const [accountId, setAccountId] = React.useState(DEMO_ACCOUNTS[0].id);
  const [typeFilter, setTypeFilter] = React.useState('All');
  const [query, setQuery] = React.useState('');
  const [reversing, setReversing] = React.useState<LedgerEntry | null>(null);
  const [refreshTick, setRefreshTick] = React.useState(0);

  const ledger = getLedger(accountId);
  const types = ['All', ...Array.from(new Set(ledger.map((e) => e.type)))];

  const filtered = ledger.filter((e) => {
    const matchesType = typeFilter === 'All' || e.type === typeFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || e.referenceId.toLowerCase().includes(q) || e.reason.toLowerCase().includes(q) || e.id.toLowerCase().includes(q);
    return matchesType && matchesQuery;
  });

  return (
    <div className="space-y-6" key={refreshTick}>
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Credit Transactions</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Append-only ledger. Corrections are new reversal entries — nothing here can be deleted or silently edited.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg bg-white">
          {DEMO_ACCOUNTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg bg-white">
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reference, reason, or ID..." className="flex-1 min-w-[200px] px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg bg-white" />
        <button onClick={() => setRefreshTick((t) => t + 1)} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Export (CSV — prototype)</button>
      </div>

      <div className="overflow-x-auto bg-white border border-[#111111]/10 rounded-lg">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-[#111111]/10">
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Type</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Amount</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Balance After</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Status</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Timestamp</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Actor / Source</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Reference</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56]">Reason</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-[#F4EEE0] last:border-0">
                <td className="p-2 whitespace-nowrap font-semibold">{e.type}</td>
                <td className={`p-2 whitespace-nowrap font-black ${e.amount < 0 ? 'text-red-600' : e.amount > 0 ? 'text-emerald-600' : 'text-[#8A7A56]'}`}>{e.amount > 0 ? '+' : ''}{e.amount}</td>
                <td className="p-2 whitespace-nowrap">{e.balanceAfter}</td>
                <td className="p-2 whitespace-nowrap">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${e.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : e.status === 'Reversed' ? 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]' : 'bg-red-50 text-red-700 border-red-200'}`}>{e.status}</span>
                </td>
                <td className="p-2 whitespace-nowrap text-[#8A7A56]">{new Date(e.createdAt).toLocaleString('en-IN')}</td>
                <td className="p-2 whitespace-nowrap text-[#8A7A56]">{e.actor} / {e.source}</td>
                <td className="p-2 whitespace-nowrap font-mono text-[10px] text-[#B0A588]">{e.referenceId}</td>
                <td className="p-2 max-w-xs truncate">{e.reason}</td>
                <td className="p-2 whitespace-nowrap">
                  {e.status === 'Completed' && e.amount !== 0 && (
                    <button onClick={() => setReversing(e)} className="text-[10px] font-bold uppercase tracking-wider text-red-700 hover:underline">Reverse</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-xs text-[#8A7A56]">No transactions match this search and filter.</p>}
      </div>

      {reversing && (
        <ReasonModal
          onCancel={() => setReversing(null)}
          onConfirm={(reason) => {
            reverseLedgerEntry(accountId, reversing.id, 'Platform Admin', reason);
            setReversing(null);
            setRefreshTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
