'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setFocusedIndex(-1);
      return;
    }
    const filtered = legalDatabase.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.source.toLowerCase().includes(query.toLowerCase()) ||
      item.snippet.toLowerCase().includes(query.toLowerCase()) ||
      item.id.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
    setFocusedIndex(-1);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('NEXTCASE_CURRENT_DOC_CONTEXT', JSON.stringify(item));
    }
    router.push(`/dashboard/search?q=${encodeURIComponent(item.title)}&query=${encodeURIComponent(item.title)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setResults([]);
      setFocusedIndex(-1);
    } else if (e.key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < results.length) {
        e.preventDefault();
        handleSelect(results[focusedIndex]);
      } else {
        // Standard global search routing
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) {
          router.push(`/dashboard/search?q=${encodeURIComponent(trimmed)}&query=${encodeURIComponent(trimmed)}`);
        }
      }
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center items-center px-6 max-w-4xl mx-auto w-full text-center z-10 relative pt-24 pb-12 md:pt-32 md:pb-16">

      {/* Main Premium Headline */}
      <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#111111] mb-6 leading-tight max-w-2xl">
        The Zero-Knowledge <span className="text-indigo-600">Operating System</span> for Modern Litigation
      </h1>

      {/* Subheading: Full obsidian-charcoal contrast for executive readability */}
      <p className="text-sm md:text-base text-neutral-800 max-w-xl mx-auto mb-10 font-serif italic leading-relaxed font-semibold">
        Securely query precedents, analyze active evidence chronologies, and compile certified pleading drafts in an integrated, zero-trust context.
      </p>

      {/* Centerpiece Intelligent Interactive Search Bar */}
      <div className="w-full max-w-2xl relative mb-12" ref={dropdownRef}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = query.trim();
            if (trimmed) {
              router.push(`/dashboard/search?q=${encodeURIComponent(trimmed)}&query=${encodeURIComponent(trimmed)}`);
            }
          }}
          className="w-full bg-white border border-neutral-300 rounded-2xl p-2.5 shadow-2xl shadow-neutral-200/40 flex items-center gap-3 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 transition-all duration-300"
        >
          <span className="pl-4 text-neutral-500 text-xl select-none" aria-hidden="true">🔍</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search active cases, statutes, NI Act precedents..."
            aria-label="Search active cases, statutes, NI Act precedents..."
            className="flex-1 bg-transparent border-none outline-none text-[#111111] text-sm md:text-base font-bold placeholder-neutral-400 py-3"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/15 text-white font-bold text-xs md:text-sm px-8 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
          >
            Search
          </button>
        </form>

        {/* Live interactive results listing (Floating Dropdown Panel) */}
        {results.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-neutral-200 rounded-2xl shadow-2xl p-2 z-50 text-left max-h-[300px] overflow-y-auto animate-fadeIn">
            <p className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest px-3 py-2 border-b border-neutral-100">
              Matched {results.length} Entries (Arrow keys navigate, Enter selects)
            </p>
            {results.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`w-full text-left p-3.5 rounded-xl transition-colors duration-150 flex flex-col gap-1 border-b border-neutral-100/60 last:border-0 cursor-pointer group ${
                  focusedIndex === index ? 'bg-neutral-100 ring-2 ring-indigo-600/20' : 'hover:bg-neutral-50'
                }`}
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

      {/* Quick Actions Panel: High-contrast link styles */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs md:text-sm font-extrabold text-[#111111]">
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
