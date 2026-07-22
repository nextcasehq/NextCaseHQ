'use client';

import React from 'react';

interface JudgmentDocument {
  id: string;
  title: string;
  court: string;
  snippet: string;
  sourceUrl: string;
  provider: string;
}

interface JudgmentSearchResult {
  status: 'ok' | 'unavailable' | 'error';
  query: string;
  provider: string;
  documents: JudgmentDocument[];
  message?: string;
}

/**
 * Judgment Research — architecture-only milestone. This page exercises
 * the real GET /api/judgments/search -> searchJudgments() ->
 * PlaceholderJudgmentProvider path end to end, so the wiring is proven
 * even though no external judgment source is connected yet. It is
 * deliberately not linked from any nav, dashboard quick action, or the
 * landing page — reachable only by direct URL, so the rest of the
 * application behaves exactly as if this feature didn't exist yet.
 */
export default function JudgmentResearchPage() {
  const [query, setQuery] = React.useState('');
  const [result, setResult] = React.useState<JudgmentSearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [needsAuth, setNeedsAuth] = React.useState(false);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/judgments/search?q=${encodeURIComponent(q)}`);
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) {
        setResult({ status: 'error', query: q, provider: 'none', documents: [], message: 'Judgment Research is temporarily unavailable.' });
        return;
      }
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  if (needsAuth) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <span className="text-3xl">🔒</span>
        <h1 className="mt-3 text-base font-bold text-[#4A4130]">Authentication Required</h1>
        <p className="mt-1 text-xs text-[#B0A588]">Sign in to use Judgment Research.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-xl font-black uppercase tracking-tight text-[#111111]">Judgment Research</h1>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#B0A588]">
        Architecture preview — no external judgment source is connected yet.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="mt-6 flex gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search judgments, citations, case names…"
          aria-label="Search judgments"
          className="flex-1 rounded-lg border border-[#E7DFC9] bg-[#FBFAF6] px-3 py-2 text-sm text-[#241E17] focus:border-[#8A6D2F] focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#8A6D2F] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#6F5624] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Search
        </button>
      </form>

      {loading && <p className="mt-6 text-xs text-[#B0A588]">Searching…</p>}

      {!loading && result && result.status !== 'ok' && (
        <div className="mt-6 rounded-xl border border-[#E7DFC9] bg-[#FBF8F1] p-5">
          <p className="text-sm font-bold text-[#241E17]">This feature is being enhanced</p>
          <p className="mt-1 text-xs leading-relaxed text-[#8A7A56]">
            {result.message ?? 'Judgment Research is being enhanced and isn’t available yet.'}
          </p>
        </div>
      )}

      {!loading && result && result.status === 'ok' && (
        <ul className="mt-6 space-y-3">
          {result.documents.map((doc) => (
            <li key={doc.id} className="rounded-xl border border-[#E7DFC9] bg-white p-4">
              <p className="text-sm font-bold text-[#241E17]">{doc.title}</p>
              <p className="text-xs text-[#8A7A56]">{doc.court}</p>
              <p className="mt-2 text-xs leading-relaxed text-[#5C5340]">{doc.snippet}</p>
              <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-bold text-[#8A6D2F] hover:underline">
                View source ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
