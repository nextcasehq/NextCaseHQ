import React from 'react';

export default function EvidencePage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans">
      <div className="border-b border-[#111111]/10 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-widest text-[#111111]">Evidence Registrar</h1>
        <p className="text-sm font-serif italic text-[#111111]/60">Cryptographically chained ledger hash integrity.</p>
      </div>

      <div className="border border-dashed border-[#111111]/20 rounded p-12 text-center text-sm font-serif italic text-[#111111]/40">
        No exhibits currently registered in this tenant portfolio context.
      </div>
    </div>
  );
}
