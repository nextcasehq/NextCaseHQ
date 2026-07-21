'use client';

import React from 'react';
import { getAuditLog, type AuditEvent } from '@/lib/admin/audit-log';

export default function AdminAuditLogPage() {
  const [events, setEvents] = React.useState<AuditEvent[]>([]);
  const [query, setQuery] = React.useState('');
  const [resultFilter, setResultFilter] = React.useState<'All' | 'SUCCESS' | 'FAILURE'>('All');

  React.useEffect(() => {
    setEvents(getAuditLog());
  }, []);

  const filtered = events.filter((e) => {
    if (resultFilter !== 'All' && e.result !== resultFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      e.actor.toLowerCase().includes(q) ||
      e.target.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      (e.tenantId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Audit Logs</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Append-only. Every privileged action anywhere in the Admin Panel appears here — there is no delete action anywhere in this UI.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search actor, target, action, tenant..." className="flex-1 min-w-[220px] px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg bg-white" />
        <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value as typeof resultFilter)} className="px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg bg-white font-semibold">
          <option value="All">All Results</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
        </select>
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#F4EEE0] text-[#8A7A56] uppercase text-[10px] tracking-wider">
              <th className="text-left p-3">Timestamp</th>
              <th className="text-left p-3">Actor</th>
              <th className="text-left p-3">Tenant</th>
              <th className="text-left p-3">Target</th>
              <th className="text-left p-3">Action</th>
              <th className="text-left p-3">Reason</th>
              <th className="text-left p-3">Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-[#F4EEE0] last:border-0 align-top">
                <td className="p-3 whitespace-nowrap text-[#8A7A56]">{new Date(e.timestamp).toLocaleString('en-IN')}</td>
                <td className="p-3">{e.actor}<div className="text-[10px] text-[#B0A588]">{e.actorRole}</div></td>
                <td className="p-3">{e.tenantId || '—'}</td>
                <td className="p-3">{e.target}</td>
                <td className="p-3">{e.action}</td>
                <td className="p-3 max-w-xs">{e.reason}</td>
                <td className="p-3">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${e.result === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{e.result}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-[#8A7A56]">No matching audit events.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
