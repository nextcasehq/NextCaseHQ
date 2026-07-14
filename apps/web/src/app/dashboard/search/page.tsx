'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Mock highly realistic litigation/law search registry database
  const mockDatabase = [
    {
      title: 'K. R. Sharma v. State of Maharashtra',
      category: 'CASE LAW',
      citation: '2026 SCC OnLine HC 412',
      summary: 'Division bench ruling on the applicability of limitation period extensions under the Negotiable Instruments (NI) Act, Section 138 during systemic interruptions.',
      snippet: '“...the period of compliance of 15 days is directory when physical service of notice is delayed by certified post office return logs...”'
    },
    {
      title: 'Negotiable Instruments Act, 1881 — Section 138',
      category: 'STATUTE',
      citation: 'Section 138, Act 26 of 1881',
      summary: 'Dishonour of cheque for insufficiency, etc., of funds in the account. Strict timeline mappings require 15 days notice and 30 days filing window.',
      snippet: '“...such cheque shall be deemed to have been dishonoured and the drawer shall be liable to punishment for a term which may extend to two years...”'
    },
    {
      title: 'Harrods Ltd v. Westminster Corporation',
      category: 'PRECEDENT',
      citation: '[2026] EWHC 105 (Comm)',
      summary: 'UK Commercial Court precedent on multi-tenant corporate ledger audit compliance and HMAC-SHA256 non-repudiation ledger protocols.',
      snippet: '“...once transactions are securely written to the tenant boundary, neither principal may retroactively modify the event envelope...”'
    },
    {
      title: 'Writ Petition (Civil) No. 132 of 2026',
      category: 'EXHIBIT',
      citation: 'NextCaseHQ Technologies Inc. v. Union of India',
      summary: 'Pending petition seeking dynamic procedural extensions under Article 226 of the Constitution of India regarding zero-knowledge operating constraints.',
      snippet: '“...interim prayers include immediate protection of cryptographic keys held under CloudKMSProviders inside local jurisdictions...”'
    }
  ];

  const performSearch = (searchTerm: string) => {
    setSearching(true);
    // Simulate high-performance search retrieval index delay (INP targeted <15ms)
    setTimeout(() => {
      if (!searchTerm.trim()) {
        setResults([]);
      } else {
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = mockDatabase.filter(
          (item) =>
            item.title.toLowerCase().includes(lowerTerm) ||
            item.category.toLowerCase().includes(lowerTerm) ||
            item.summary.toLowerCase().includes(lowerTerm) ||
            item.snippet.toLowerCase().includes(lowerTerm)
        );
        setResults(filtered);
      }
      setSearching(false);
    }, 250);
  };

  useEffect(() => {
    setQuery(initialQuery);
    performSearch(initialQuery);
  }, [initialQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    performSearch(val);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    router.push('/dashboard/search');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 font-sans">
      <div className="border-b border-[#111111]/10 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest text-[#111111]">Global Search & Discovery</h1>
          <p className="text-sm font-serif italic text-[#111111]/60">Interactions to Next Paint (INP) targeted at under 15ms.</p>
        </div>
        {query && (
          <button
            onClick={handleClear}
            className="text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-800 transition-colors"
          >
            Clear Search
          </button>
        )}
      </div>

      <div className="relative flex items-center bg-white border border-neutral-200 rounded-xl p-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-600/10 transition-all">
        <span className="pl-3 text-neutral-400 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Query statutory codes, court transcripts, exhibits, or legal definitions..."
          className="w-full bg-transparent pl-3 pr-12 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none font-medium"
        />
        {searching && (
          <span className="absolute right-4 w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        )}
      </div>

      <div className="space-y-6">
        {results.length > 0 ? (
          results.map((res, index) => (
            <div
              key={index}
              className="p-6 bg-white border border-neutral-100 rounded-2xl hover:border-indigo-100 transition-all hover:shadow-sm"
            >
              <div className="flex justify-between items-start gap-4 mb-2.5">
                <div>
                  <span className="text-[10px] font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mr-2.5">
                    {res.category}
                  </span>
                  <span className="text-xs font-bold text-neutral-400 font-mono tracking-wider">
                    {res.citation}
                  </span>
                </div>
              </div>
              <h3 className="font-bold text-base text-[#111111] mb-2">{res.title}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-serif mb-4">
                {res.summary}
              </p>
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 font-mono text-xs text-neutral-600 leading-relaxed">
                {res.snippet}
              </div>
            </div>
          ))
        ) : query ? (
          <div className="border border-dashed border-[#111111]/20 rounded p-12 text-center text-sm font-serif italic text-[#111111]/40">
            No matching litigation documents found for "{query}". Try searching "Sharma", "138", or "Precedent".
          </div>
        ) : (
          <div className="border border-dashed border-[#111111]/20 rounded p-12 text-center text-sm font-serif italic text-[#111111]/40">
            Enter a query above to explore indexed litigation data...
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-4xl mx-auto text-center font-mono text-xs text-neutral-400">
        Initializing search shell...
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
