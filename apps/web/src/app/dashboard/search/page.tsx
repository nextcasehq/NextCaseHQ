import React from 'react';

export default function SearchPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans">
      <div className="border-b border-[#111111]/10 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-widest text-[#111111]">Global Search & Discovery</h1>
        <p className="text-sm font-serif italic text-[#111111]/60">Interactions to Next Paint (INP) targeted at under 15ms.</p>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Query statutory codes, court transcripts, exhibits, or legal definitions..."
          className="w-full px-6 py-4 bg-white border border-[#111111]/10 rounded shadow-sm outline-none focus:border-[#111111] font-sans text-base placeholder:text-[#111111]/40"
        />
      </div>

      <div className="border border-dashed border-[#111111]/20 rounded p-12 text-center text-sm font-serif italic text-[#111111]/40">
        Enter a query above to explore indexed litigation data...
      </div>
    </div>
  );
}
