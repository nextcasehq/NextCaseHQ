import React from 'react';

export default function CasesPage() {
  const cases = [
    { id: 'LD-2026-0041', title: 'State of Maharashtra v. K. R. Sharma', status: 'HEARING_REMINDER', court: 'Delhi High Court', jurisdiction: 'IN' },
    { id: 'LD-2026-0182', title: 'Fraser Inc. v. Sterling Commerce', status: 'CRITICAL_LIMITATION_DEADLINE', court: 'S.D.N.Y. Federal Court', jurisdiction: 'US' },
    { id: 'LD-2026-0095', title: 'Harrods Ltd v. Westminster Corp', status: 'INVOICE_SETTLED', court: 'London Commercial Court', jurisdiction: 'UK' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-center border-b border-[#111111]/10 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-[#111111]">Active Litigation Portfolios</h1>
          <p className="text-sm font-serif italic text-[#111111]/60">Secure multi-tenant workspace isolation active.</p>
        </div>
        <button className="px-4 py-2 bg-[#111111] text-[#FDFBF7] text-xs uppercase tracking-wider font-bold rounded">
          + Open New Case
        </button>
      </div>

      <div className="space-y-4">
        {cases.map((c) => (
          <div key={c.id} className="p-6 border border-[#111111]/10 rounded bg-white flex justify-between items-center hover:border-[#111111] transition-all">
            <div>
              <span className="text-[10px] font-mono border border-brand/20 bg-[#111111]/5 text-[#111111]/70 px-2 py-0.5 rounded uppercase tracking-wider mr-2">
                {c.id}
              </span>
              <span className="text-xs font-bold text-[#111111]/40 uppercase tracking-widest">
                {c.court} // {c.jurisdiction}
              </span>
              <h3 className="font-bold text-lg text-[#111111] mt-2">{c.title}</h3>
            </div>
            <span className="px-3 py-1.5 border border-[#111111]/10 rounded text-[10px] font-mono uppercase tracking-wider bg-[#111111]/5">
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
