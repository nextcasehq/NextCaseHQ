import React from 'react';

export default function DraftBuilderPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans">
      <div className="border-b border-[#111111]/10 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-widest text-[#111111]">Draft Builder & Canvas</h1>
        <p className="text-sm font-serif italic text-[#111111]/60">WYSIWYG high-fidelity litigation document editor.</p>
      </div>

      <div className="border border-dashed border-[#111111]/20 rounded p-12 text-center text-sm font-serif italic text-[#111111]/40">
        Launch a case workspace or prompt the AI Chamber to initialize a litigation draft.
      </div>
    </div>
  );
}
