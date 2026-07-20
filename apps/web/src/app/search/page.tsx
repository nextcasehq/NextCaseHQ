'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';

interface SearchResultItem {
  id: string;
  title: string;
  snippet: string;
  score: number;
  href: string;
  // Only ever true for Beta Preview's synthetic search results (see
  // lib/beta/demo-search-data.ts) — never set by the real Search Service.
  is_demo?: boolean;
}

interface SearchResultGroup {
  type: string;
  providerName: string;
  items: SearchResultItem[];
}

const GROUP_LABELS: Record<string, string> = {
  DOCUMENT: 'Documents',
  MATTER: 'Matters',
  PROCEEDING: 'Proceedings',
  CLIENT: 'Clients',
  COURT_NOTE: 'Court Notes',
  JUDGMENT: 'Judgments',
  ACT: 'Acts',
  SECTION: 'Sections',
  CITATION: 'Citations',
};

/**
 * Universal Search (Product Direction, Milestone 5). Calls the ONE
 * GET /api/search endpoint and renders whatever groups[] it returns — no
 * client-side fan-out to multiple endpoints and no client-side merging of
 * differently-scored results, since the approved "Option C" Search
 * Service architecture already does that server-side
 * (docs/MILESTONE_5_PLAN.md §2). Results render grouped by entity type,
 * never as one cross-type ranked list.
 */
function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  // Matter-scoped search entry point (Matter page -> here), reusing the
  // existing matter_id filter precedent already proven on
  // GET /api/documents and GET /api/search's own document path.
  const matterId = searchParams.get('matter_id');
  const typeFilter = searchParams.get('type');

  const [query, setQuery] = useState(initialQuery);
  const [needsAuth, setNeedsAuth] = useState(false);
  // Only ever set true by a successful, unauthenticated GET /api/beta-status
  // — i.e. Beta Preview is actually active right now. Governs whether the
  // "Authentication Required" wall below uses neutral beta wording instead
  // of the normal sign-in wording; when Beta Preview is off this never
  // becomes true and the wall is unchanged.
  const [betaModeActive, setBetaModeActive] = useState(false);
  // Set only when a successful (200) search response carries the
  // `beta_preview` marker — i.e. these are Beta Preview's synthetic demo
  // search results, not the real Search Service. Never set any other way.
  const [isDemoSearch, setIsDemoSearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);

  const runSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) return;
      setLoading(true);
      setHasSearched(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q });
        if (matterId) params.set('matter_id', matterId);
        if (typeFilter) params.set('type', typeFilter);
        const res = await fetch(`/api/search?${params.toString()}`);
        if (res.status === 401) {
          setNeedsAuth(true);
          fetch('/api/beta-status')
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data?.enabled) setBetaModeActive(true);
            })
            .catch(() => {});
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.message || 'Search failed. Please try again.');
          return;
        }
        const data = await res.json();
        setGroups(data.groups);
        setIsDemoSearch(!!data.beta_preview);
      } finally {
        setLoading(false);
      }
    },
    [matterId, typeFilter]
  );

  useEffect(() => {
    if (initialQuery.trim()) runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {betaModeActive ? (
          <>
            <span className="text-3xl">👁️</span>
            <h3 className="text-base font-bold text-[#4A4130] mt-3">Preview Mode</h3>
            <p className="text-xs text-[#B0A588] mt-1 max-w-sm mx-auto">This action is unavailable in preview mode.</p>
          </>
        ) : (
          <>
            <span className="text-3xl">🔒</span>
            <h3 className="text-base font-bold text-[#4A4130] mt-3">Authentication Required</h3>
            <p className="text-xs text-[#B0A588] mt-1 max-w-sm mx-auto">Sign in to search.</p>
            <Link href="/login" className="inline-block mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
              Go to Login →
            </Link>
          </>
        )}
      </div>
    );
  }

  const totalResults = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <article>
      <header className="mb-6">
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111]">Search</h1>
        <p className="text-xs text-[#B0A588] font-bold uppercase tracking-wider mt-1">
          Matters, Proceedings, Clients, Court Notes, and Documents
        </p>
        {matterId && (
          <p className="text-[10px] text-[#8A6D2F] font-bold uppercase tracking-wider mt-2">
            Scoped to this Matter ·{' '}
            <Link href="/search" className="underline hover:text-[#6F5624]">
              Search everywhere instead
            </Link>
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by case number, client name, court, or keyword…"
          className="flex-1 min-w-0 px-4 py-3 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-3 bg-[#8A6D2F] hover:bg-[#6F5624] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">{error}</div>
      )}

      {!loading && isDemoSearch && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#C6A253]/40 bg-[#FBF6EA] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8A6D2F]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6A253]" aria-hidden="true" />
          Beta Preview — sample legal-research data only
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
        </div>
      )}

      {!loading && hasSearched && totalResults === 0 && !error && (
        <EmptyState
          icon={<span className="text-2xl">🔍</span>}
          title={`No results for "${initialQuery || query}"`}
          description="Try a case number, client name, or court."
        />
      )}

      {!loading &&
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <section key={g.type} className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-3">
                {GROUP_LABELS[g.type] ?? g.type} ({g.items.length})
              </h2>
              <div className="space-y-3">
                {g.items.map((item) => (
                  <div key={item.id} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.href ? (
                        <Link href={item.href} className="text-sm font-bold text-[#3A3222] hover:text-[#8A6D2F]">
                          {item.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-bold text-[#3A3222]">{item.title}</p>
                      )}
                      {item.is_demo && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FBF6EA] text-[#8A6D2F] border border-[#C6A253]/40 uppercase tracking-wider">
                          Demo Data
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8A7A56] mt-1">{item.snippet}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}

      {!hasSearched && !loading && (
        <div className="text-center py-16 text-xs text-[#B0A588]">
          Enter a search above to find Matters, Proceedings, Clients, Court Notes, and Documents.
        </div>
      )}
    </article>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex justify-center items-center py-20">
          <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
