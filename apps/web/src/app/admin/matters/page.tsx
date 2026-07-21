'use client';

import React from 'react';
import { getMatterOversightRows, type MatterOversightRow } from '@/lib/admin/matter-oversight';

type OversightFilter = 'All' | 'Active' | 'Closed' | 'Hearing Soon' | 'eCourts linked' | 'Needs rechecking';

export default function AdminMattersOversightPage() {
  const [filter, setFilter] = React.useState<OversightFilter>('All');
  const rows: MatterOversightRow[] = getMatterOversightRows();

  const filtered = rows.filter((m) => {
    switch (filter) {
      case 'All': return true;
      case 'Active': return !m.closed;
      case 'Closed': return m.closed;
      case 'Hearing Soon': return m.status === 'Hearing Soon';
      case 'eCourts linked': return m.ecourtsLinked;
      case 'Needs rechecking': return m.needsRechecking;
      default: return true;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Matter Register Oversight</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">
          Operational metadata only. Private strategy, confidential evidence, draft arguments, internal advocate notes, and client instructions are never shown here — that requires a separately authorised, audited role.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['All', 'Active', 'Closed', 'Hearing Soon', 'eCourts linked', 'Needs rechecking'] as OversightFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${filter === f ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white' : 'bg-white border-[#E7DFC9] text-[#8A6D2F]'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto bg-white border border-[#111111]/10 rounded-lg">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-[#111111]/10">
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Matter</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Status</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Category</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Stage</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Next Hearing</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Documents</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">eCourts</th>
              <th className="text-left p-2 font-black uppercase tracking-wider text-[#8A7A56] whitespace-nowrap">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-[#F4EEE0] last:border-0">
                <td className="p-2 max-w-xs truncate font-semibold">{m.title}</td>
                <td className="p-2 whitespace-nowrap">{m.status}</td>
                <td className="p-2 whitespace-nowrap">{m.category}</td>
                <td className="p-2 max-w-[160px] truncate">{m.stage}</td>
                <td className="p-2 whitespace-nowrap">{m.nextHearingDate ? new Date(m.nextHearingDate).toLocaleDateString('en-IN') : '—'}</td>
                <td className="p-2 whitespace-nowrap">{m.documentCount}</td>
                <td className="p-2 whitespace-nowrap">
                  {m.ecourtsLinked ? (
                    m.needsRechecking ? <span className="text-amber-600 font-bold">Needs Rechecking</span> : <span className="text-emerald-600 font-bold">Linked</span>
                  ) : <span className="text-[#B0A588]">Not linked</span>}
                </td>
                <td className="p-2 whitespace-nowrap text-[#8A7A56]">{new Date(m.lastUpdated).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-4 text-xs text-[#8A7A56]">No matters match this filter.</p>}
      </div>
    </div>
  );
}
