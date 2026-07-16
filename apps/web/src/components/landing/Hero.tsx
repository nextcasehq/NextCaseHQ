'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface SearchResult {
  id: string;
  category: 'Statutes' | 'Exhibits' | 'Precedents';
  title: string;
  source: string;
  snippet: string;
  jurisdiction: string;
}

const legalDatabase: SearchResult[] = [
  {
    id: 'SEC-138-NIA',
    category: 'Statutes',
    title: 'Section 138 - Dishonour of cheque for insufficiency of funds',
    source: 'Negotiable Instruments Act, 1881',
    snippet: 'Where any cheque drawn by a person on an account maintained by him with a banker for payment of any amount of money to another person from out of that account...',
    jurisdiction: 'IN'
  },
  {
    id: 'EX-02-TIMELINE',
    category: 'Exhibits',
    title: 'Registered Post Return Receipt',
    source: 'Matter Exhibit B // Registered Envelope Cover',
    snippet: 'Delivery confirmation dated 15-Jan-2026. Signed return card bearing the acknowledgment seal of the respondent corp.',
    jurisdiction: 'IN'
  },
  {
    id: 'SC-2024-81',
    category: 'Precedents',
    title: 'M/s. Sterling Exports v. State of Maharashtra',
    source: 'Supreme Court of India // Criminal Appeal No. 81 of 2024',
    snippet: 'Held: The tolling of limitation periods for Section 138 filings under special conditions must be strictly calculated starting the day following notice receipt...',
    jurisdiction: 'IN'
  }
];

export default function Hero() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const filtered = legalDatabase.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.source.toLowerCase().includes(query.toLowerCase()) ||
      item.snippet.toLowerCase().includes(query.toLowerCase()) ||
      item.id.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }, [query]);

  const handleResultClick = (item: SearchResult) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("NEXTCASE_CURRENT_DOC_CONTEXT", JSON.stringify(item));
      window.location.href = "/login";
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 max-w-4xl mx-auto w-full text-center z-10 relative">

      {/* Law-inspired "N" logo container with premium micro-interactions */}
      <div className="mb-10 p-5 bg-white border border-neutral-200/80 rounded-2xl shadow-md inline-flex items-center justify-center hover:scale-[1.04] hover:border-indigo-500 hover:shadow-lg transition-all duration-300 ease-out cursor-pointer group">
        <svg
          className="w-14 h-14 text-[#111111] group-hover:text-indigo-600 transition-colors duration-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          {/* Courthouse-inspired vertical pillars forming the letter N */}
          <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex flex-col ml-3 text-left">
          <span className="font-extrabold text-base tracking-tight text-[#111111]">
            NextCase<span className="text-indigo-600">HQ</span>
          </span>
          <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 font-bold leading-none mt-0.5">
            Litigation Operating System
          </span>
        </div>
      </div>

      {/* Minimalist Heading with bold contrast and letter-spacing */}
      <h1 className="text-4xl md:text-6xl font-black tracking-tight text-[#111111] mb-6 leading-none">
        NextCase<span className="text-indigo-600">HQ</span>
      </h1>

      {/* Subheading: Upgraded grey contrast for full WCAG AA readability */}
      <p className="text-sm md:text-lg text-neutral-800 max-w-xl mx-auto mb-10 font-serif italic leading-relaxed font-semibold">
        Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings in unified context.
      </p>

      {/* Central Search Bar Wrapper with focus alignment */}
      <div className="w-full max-w-2xl relative mb-12">
        <div className="w-full bg-white border border-neutral-300/90 rounded-2xl p-2.5 shadow-xl shadow-neutral-200/50 flex items-center gap-3 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 transition-all duration-300">
          <span className="pl-4 text-neutral-500 text-xl select-none" aria-hidden="true">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search active cases, statutes, NI Act precedents..."
            aria-label="Search active cases, statutes, NI Act precedents..."
            className="flex-1 bg-transparent border-none outline-none text-[#111111] text-sm md:text-base font-bold placeholder-neutral-500 py-3"
          />
          <Link
            href="/login"
            className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/15 text-white font-bold text-xs md:text-sm px-8 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
          >
            Sign In
          </Link>
        </div>

        {/* Real-time search result listing (Floating Dropdown) */}
        {results.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-2xl p-2 z-50 text-left max-h-[300px] overflow-y-auto animate-fadeIn">
            {results.map((item) => (
              <button
                key={item.id}
                onClick={() => handleResultClick(item)}
                className="w-full text-left p-3.5 hover:bg-neutral-50 rounded-lg transition-colors duration-150 flex flex-col gap-1 border-b border-neutral-100/60 last:border-0 cursor-pointer group"
              >
                <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400">
                  <span className="text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded">{item.category.toUpperCase()}</span>
                  <span>{item.id}</span>
                </div>
                <h4 className="font-extrabold text-sm text-[#111111] group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-neutral-600 font-serif italic line-clamp-1">
                  "{item.snippet}"
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions Panel: Upgraded contrast text colors */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs md:text-sm font-bold text-neutral-800">
        <span className="text-neutral-500 font-extrabold uppercase tracking-widest text-[10px]">Quick Actions:</span>
        <Link href="/login" className="text-[#111111] hover:text-indigo-600 hover:underline transition-all duration-200">Access Active Chamber</Link>
        <span className="text-neutral-300 select-none">•</span>
        <Link href="/login" className="text-[#111111] hover:text-indigo-600 hover:underline transition-all duration-200">Ingest New File</Link>
        <span className="text-neutral-300 select-none">•</span>
        <Link href="/login" className="text-[#111111] hover:text-indigo-600 hover:underline transition-all duration-200">Audit Immutable Ledger</Link>
      </div>

    </main>
  );
}
