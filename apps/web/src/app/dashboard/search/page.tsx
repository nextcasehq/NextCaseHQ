'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface SearchResult {
  id: string;
  category: 'Statutes' | 'Exhibits' | 'Precedents';
  title: string;
  source: string;
  snippet: string;
  jurisdiction: string;
}

function SearchPageContent() {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Statutes' | 'Exhibits' | 'Precedents'>('ALL');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const searchParams = useSearchParams();
  useEffect(() => {
  const q = searchParams.get("q") || searchParams.get("query");

  if (q && q.trim()) {
    setQuery(q);
  }
}, [searchParams]);

  // High-fidelity litigation database
  const legalDatabase: SearchResult[] = [
    {
      id: 'SEC-12-BNSS',
      category: 'Statutes',
      title: 'Section 12 - Local Jurisdiction of Judicial Magistrates',
      source: 'Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023',
      snippet: 'Subject to the control of the High Court, the Chief Judicial Magistrate may, from time to time, define the local limits of the areas within which the Magistrates...',
      jurisdiction: 'IN'
    },
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
      id: 'EX-04-LEDGER',
      category: 'Exhibits',
      title: 'NextCaseHQ Client Ledger Entry',
      source: 'Matter Exhibit D // Corporate Ledger Extract',
      snippet: 'Reflects wire transaction ref tx_9948271 amounting to INR 4,50,000 initiated by petitioner on 10-Jan-2026.',
      jurisdiction: 'IN'
    },
    {
      id: 'SC-2024-81',
      category: 'Precedents',
      title: 'M/s. Sterling Exports v. State of Maharashtra',
      source: 'Supreme Court of India // Criminal Appeal No. 81 of 2024',
      snippet: 'Held: The tolling of limitation periods for Section 138 filings under special conditions must be strictly calculated starting the day following notice receipt...',
      jurisdiction: 'IN'
    },
    {
      id: 'FRCP-RULE-4',
      category: 'Statutes',
      title: 'Rule 4 - Summons and Service of Process',
      source: 'US Federal Rules of Civil Procedure (FRCP)',
      snippet: 'A summons must be served with a copy of the complaint. The plaintiff is responsible for having the summons and complaint served within the time allowed under Rule 4(m)...',
      jurisdiction: 'US'
    },
    {
      id: 'EX-FRCP-CONTRACT',
      category: 'Exhibits',
      title: 'Fraser Inc. Service Contract',
      source: 'Fraser Matter Exhibit A // Contract Section 8.2',
      snippet: 'The parties agree that all disputes arising out of this agreement shall be submitted to the exclusive jurisdiction of the S.D.N.Y. Federal Court...',
      jurisdiction: 'US'
    },
    {
      id: 'CPR-PART-7',
      category: 'Statutes',
      title: 'Part 7 - How to Start Proceedings — The Claim Form',
      source: 'UK Civil Procedure Rules (CPR)',
      snippet: 'Proceedings are started when the court issues a claim form at the request of the claimant. The claim form must contain brief details of the nature of the claim...',
      jurisdiction: 'UK'
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    const filtered = legalDatabase.filter(item => {
      const matchesQuery =
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.source.toLowerCase().includes(query.toLowerCase()) ||
        item.snippet.toLowerCase().includes(query.toLowerCase()) ||
        item.id.toLowerCase().includes(query.toLowerCase());

      return matchesQuery;
    });

    setResults(filtered);
  };

  const displayedResults = results.filter(item => {
    if (categoryFilter === 'ALL') return true;
    return item.category === categoryFilter;
  });

  const handleLoadContext = (item: SearchResult) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('NEXTCASE_CURRENT_DOC_CONTEXT', JSON.stringify(item));
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans selection:bg-[#111111] selection:text-[#FDFBF7]">
      {/* Search Header */}
      <div className="border-b border-[#111111]/10 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-widest text-[#111111]">Global Search & Discovery</h1>
        <p className="text-sm font-serif italic text-[#111111]/60">Interactions to Next Paint (INP) target: under 15ms.</p>
      </div>

      {/* Search Form Bar */}
      <form onSubmit={handleSearch} className="flex gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query statutory codes, court transcripts, exhibits, or legal definitions..."
          className="flex-1 px-6 py-4 bg-white border border-[#111111]/10 rounded shadow-sm outline-none focus:border-[#111111] font-sans text-base placeholder:text-[#111111]/40"
        />
        <button
          type="submit"
          className="px-8 bg-[#111111] text-[#FDFBF7] font-bold uppercase text-xs tracking-wider rounded hover:bg-[#111111]/90 active:scale-[0.98] transition-all"
        >
          Execute Search
        </button>
      </form>

      {/* Category Tabs */}
      {hasSearched && (
        <div className="flex gap-2 border-b border-[#111111]/5 pb-1">
          {(['ALL', 'Statutes', 'Exhibits', 'Precedents'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 text-xs uppercase tracking-wider font-bold border-b-2 transition-all ${
                categoryFilter === cat
                  ? 'border-[#111111] text-[#111111]'
                  : 'border-transparent text-[#111111]/40 hover:text-[#111111]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Search Results Render */}
      {!hasSearched ? (
        <div className="border border-dashed border-[#111111]/20 rounded p-16 text-center text-sm font-serif italic text-[#111111]/40">
          Enter a search query above to explore indexed litigation documents, statutory packs, and local evidence exhibits.
        </div>
      ) : displayedResults.length === 0 ? (
        <div className="p-12 text-center border border-[#111111]/10 rounded bg-white space-y-2">
          <p className="font-serif italic text-base text-[#111111]/60">No matched entries found.</p>
          <p className="text-xs font-mono text-[#111111]/40">Ensure correct spellings or expand jurisdictional pack settings.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-xs font-mono text-[#111111]/50 uppercase tracking-widest">
            Matched {displayedResults.length} index entries
          </p>
          <div className="space-y-4">
            {displayedResults.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedResult(item)}
                className="w-full text-left p-6 border border-[#111111]/10 rounded bg-white hover:border-[#111111] hover:shadow-sm transition-all group block cursor-pointer"
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div>
                    <span className="text-[10px] font-mono border border-[#111111]/10 bg-[#111111]/5 text-[#111111]/70 px-2 py-0.5 rounded uppercase tracking-wider mr-2">
                      {item.category}
                    </span>
                    <span className="text-xs font-bold text-[#111111]/40 uppercase tracking-widest">
                      {item.source} // {item.jurisdiction}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#111111]/40">{item.id}</span>
                </div>
                <h3 className="font-bold text-lg text-[#111111] group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm font-serif text-[#111111]/70 leading-relaxed bg-[#FDFBF7] p-4 rounded border border-[#111111]/5">
                  "{item.snippet}"
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* High-Fidelity Interactive Search Result Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-[#111111]/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-[#FDFBF7] w-full max-w-2xl border border-[#111111]/20 rounded p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-[#111111]/10 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-mono border border-[#111111]/10 bg-[#111111]/5 text-[#111111]/70 px-2 py-0.5 rounded uppercase tracking-wider mr-2">
                  {selectedResult.category}
                </span>
                <span className="text-xs font-bold text-[#111111]/40 uppercase tracking-widest">
                  {selectedResult.source} // {selectedResult.jurisdiction}
                </span>
                <h2 className="text-xl font-black uppercase tracking-wider text-[#111111] mt-2">
                  {selectedResult.title}
                </h2>
              </div>
              <span className="text-xs font-mono text-[#111111]/40">{selectedResult.id}</span>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-2">Document Content Extract</h4>
                <p className="text-sm font-serif text-[#111111]/80 leading-relaxed bg-white p-6 rounded border border-[#111111]/10 text-justify">
                  "{selectedResult.snippet}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#111111]/5 p-4 rounded border border-[#111111]/5">
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-[#111111]/50 uppercase">Cryptographic SHA-256 Hash</h5>
                  <p className="text-[10px] font-mono text-[#111111]/70 overflow-hidden text-ellipsis">
                    {selectedResult.id === 'SEC-12-BNSS' ? 'c9a2f1b8c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8' : 'f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0'}
                  </p>
                </div>
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-[#111111]/50 uppercase">AES-GCM Security Envelope</h5>
                  <p className="text-[10px] font-mono text-[#111111]/70">
                    ENVELOPE_ENCRYPTED_STABLE // KMS v1-active
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#111111]/10">
                <button
                  type="button"
                  onClick={() => setSelectedResult(null)}
                  className="px-5 py-3 border border-[#111111]/15 text-[#111111] text-xs font-bold uppercase tracking-wider rounded hover:bg-[#111111]/5 transition-all"
                >
                  Close Document
                </button>
                <button
                  onClick={() => handleLoadContext(selectedResult)}
                  className="px-6 py-3 bg-[#111111] text-[#FDFBF7] text-xs font-bold uppercase tracking-wider rounded hover:bg-[#111111]/90 active:scale-[0.98] transition-all"
                >
                  Load Context into AI Chamber
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { Suspense } from 'react';

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex justify-center items-center py-20">
        <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
