'use client';

import React from 'react';
import Link from 'next/link';
import { getFirms, setFirmStatus, type FirmDetail } from '@/lib/admin/firms';
import { getBalance } from '@/lib/ai-credits/wallet-store';
import { DEMO_ADMINISTRATION_NOTICE } from '@/lib/admin/store-utils';

export default function AdminFirmsPage() {
  const [firms, setFirms] = React.useState<FirmDetail[]>([]);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    setFirms(getFirms());
  }, []);

  const filtered = firms.filter((f) => !query.trim() || f.name.toLowerCase().includes(query.trim().toLowerCase()) || f.tenantRef.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Firms / Tenants</h1>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] mt-1">{DEMO_ADMINISTRATION_NOTICE}</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search firm name or tenant reference..."
        className="w-full px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg focus:outline-none focus:border-[#8A6D2F] bg-white"
      />

      <div className="space-y-2">
        {filtered.map((f) => {
          const balance = getBalance(f.id);
          return (
            <div key={f.id} className="bg-white border border-[#111111]/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/admin/firms/${f.id}`} className="text-sm font-bold text-[#111111] hover:text-[#8A6D2F]">{f.name}</Link>
                <p className="text-[10px] text-[#8A7A56] mt-0.5">{f.tenantRef} · {f.planCode} · {f.activeMatterCount} active matters · Last activity {new Date(f.lastActivity).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]">{Math.max(0, balance.availableCredits - balance.reservedCredits)} AI Credits</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${f.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{f.status}</span>
                <Link href={`/admin/firms/${f.id}`} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">View Firm</Link>
                {f.status === 'Active' ? (
                  <button onClick={() => { setFirmStatus(f.id, 'Suspended', 'Platform Admin', 'Suspended via Admin Panel.'); setFirms(getFirms()); }} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-red-200 text-red-700 hover:bg-red-50 bg-white">Suspend</button>
                ) : (
                  <button onClick={() => { setFirmStatus(f.id, 'Active', 'Platform Admin', 'Restored via Admin Panel.'); setFirms(getFirms()); }} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Restore</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
