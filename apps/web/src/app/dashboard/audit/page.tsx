import React from 'react';

export default function AuditPage() {
  const auditLogs = [
    { timestamp: '12-Jul-2026 14:04:15', action: 'TENANT_AUTHENTICATED', user: 'counsel@firm.com', origin: '192.168.0.5' },
    { timestamp: '12-Jul-2026 14:04:22', action: 'RLS_SESSION_BOUND', user: 'system_gate', origin: 'Internal Session' },
    { timestamp: '12-Jul-2026 14:05:01', action: 'DOCUMENT_METADATA_SCRUBBED', user: 'pii_scrubber', origin: 'Edge Filter' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans">
      <div className="border-b border-[#111111]/10 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-widest text-[#111111]">Compliance & Audit Ledger</h1>
        <p className="text-sm font-serif italic text-[#111111]/60">Immutable HMAC-SHA256 signature chained audit trail.</p>
      </div>

      <div className="border border-[#111111]/10 rounded bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm font-sans">
          <thead className="bg-[#111111]/5 border-b border-[#111111]/10 text-xs font-bold uppercase tracking-wider text-[#111111]/60">
            <tr>
              <th className="p-4">Timestamp</th>
              <th className="p-4">Action Event</th>
              <th className="p-4">Principal Identity</th>
              <th className="p-4">Origin IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#111111]/10">
            {auditLogs.map((log, index) => (
              <tr key={index} className="hover:bg-[#111111]/5 transition-colors">
                <td className="p-4 font-mono text-xs">{log.timestamp}</td>
                <td className="p-4 font-bold text-[#111111]">{log.action}</td>
                <td className="p-4 font-mono text-xs">{log.user}</td>
                <td className="p-4 font-mono text-xs">{log.origin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
