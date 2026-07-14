'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LitigationDb, Matter, Case } from '@/lib/db/litigation-db';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [matchedMatters, setMatchedMatters] = useState<Matter[]>([]);
  const [matchedCases, setMatchedCases] = useState<Case[]>([]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    // Simulate fast 200ms index lookup
    setTimeout(() => {
      const allMatters = LitigationDb.getMatters();
      const allCases = LitigationDb.getCases();

      const mResult = allMatters.filter(m =>
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.clientName.toLowerCase().includes(query.toLowerCase()) ||
        m.id.toLowerCase().includes(query.toLowerCase())
      );

      const cResult = allCases.filter(c =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.court.toLowerCase().includes(query.toLowerCase()) ||
        c.id.toLowerCase().includes(query.toLowerCase())
      );

      setMatchedMatters(mResult);
      setMatchedCases(cResult);
      setIsLoading(false);
    }, 250);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 font-sans text-[#111111] animate-fadeIn">
      {/* Header */}
      <div className="border-b border-neutral-200/60 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111]">Global Search & Discovery</h1>
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">
          Interactions to Next Paint (INP) targeted at under 15ms.
        </p>
      </div>

      {/* Search Bar Form */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="flex-1 relative flex items-center bg-neutral-50 border border-neutral-200 focus-within:border-indigo-500 rounded-xl p-1.5 transition-all shadow-sm">
          <span className="pl-3 pr-2 text-neutral-400">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Query statutory codes, court transcripts, exhibits, or active litigation matters..."
            className="w-full bg-transparent border-none outline-none text-[#111111] text-sm font-medium placeholder-neutral-400 py-2.5"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-4 rounded-xl transition-all shadow-sm flex items-center gap-2"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : 'Search'}
        </button>
      </form>

      {/* Search Outcome Container */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mt-4">Indexing Litigation Nodes...</p>
        </div>
      ) : hasSearched ? (
        <div className="space-y-6">
          {matchedMatters.length === 0 && matchedCases.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-neutral-200 rounded-xl">
              <span className="text-3xl">📂</span>
              <h3 className="text-sm font-bold text-neutral-700 mt-3 uppercase tracking-wider">No Index Matches</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                No active matters, cases, or exhibits matching "{query}" exist inside your secure tenant context.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matched Matters */}
              {matchedMatters.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">
                    Matched Matters ({matchedMatters.length})
                  </h3>
                  {matchedMatters.map(m => (
                    <Link
                      key={m.id}
                      href={`/matters/${m.id}`}
                      className="block p-5 border border-neutral-200/80 rounded-xl bg-white hover:border-indigo-500 hover:shadow-sm transition-all group"
                    >
                      <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                        {m.id}
                      </span>
                      <h4 className="font-bold text-sm text-neutral-800 group-hover:text-indigo-600 mt-2">{m.title}</h4>
                      <p className="text-xs text-neutral-400 font-mono mt-1">Client: {m.clientName}</p>
                    </Link>
                  ))}
                </div>
              )}

              {/* Matched Cases */}
              {matchedCases.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">
                    Matched Case Workspaces ({matchedCases.length})
                  </h3>
                  {matchedCases.map(c => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="block p-5 border border-neutral-200/80 rounded-xl bg-white hover:border-indigo-500 hover:shadow-sm transition-all group"
                    >
                      <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                        {c.id}
                      </span>
                      <h4 className="font-bold text-sm text-neutral-800 group-hover:text-indigo-600 mt-2">{c.title}</h4>
                      <p className="text-xs text-neutral-400 font-mono mt-1">{c.court}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-neutral-200 rounded-xl p-16 text-center text-sm font-serif italic text-[#111111]/40 bg-white">
          Enter a search query above to explore indexed multi-tenant dockets and portfolios...
        </div>
      )}
    </div>
  );
}
